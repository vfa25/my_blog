# 登录状态模块源码注解

## JWT(Json Web Token)

这里有一篇文章来介绍JWT的[前后端分离之JWT用户认证](https://www.jianshu.com/p/180a870a308a)。

根据[django-rest-framework-jwt](https://github.com/jpadilla/django-rest-framework-jwt)文档，我们能获取到一串以`.`三分的字符串，如下所示：

```py
# eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6ImFkbWluIiwiZXhwIjoxNTY0NDEzMTM2LCJlbWFpbCI6ImhlZXJtb3NpMzlAMTYzLmNvbSJ9.klr28lM-jCJeB-2D1yRRAG27X1gqwStNmjDuuH9DECA

# 对上述jwt编码串，进行base64.b64decode解码
# 第一部分可得，即类型为 JWT，算法为 HS256
b'{"typ":"JWT","alg":"HS256"}'
# 第二部分可得，即对应user表主键为2，用户名，expires过期时间，注册邮箱等用户信息
b'{"user_id":2,"username":"xxx","exp":1564413136,"email":"xxxxx@163.com"}'
```

源码注解

```py
# 先来看一下 obtain_jwt_token 这个 APIView
from rest_framework_jwt.views import obtain_jwt_token
# obtain_jwt_token
# obtain_jwt_token = ObtainJSONWebToken.as_view()

class ObtainJSONWebToken(JSONWebTokenAPIView):
    """
    API View that receives a POST with a user's username and password.

    Returns a JSON Web Token that can be used for authenticated requests.
    """
    serializer_class = JSONWebTokenSerializer

# ObtainJSONWebToken继承自 JSONWebTokenAPIView，
# 后者的 post 方法有一段逻辑，很明显，token的生成是 JSONWebTokenSerializer 做的， Ctrl + - 退回去
def post(self, request, *args, **kwargs):
    serializer = self.get_serializer(data=request.data)

    if serializer.is_valid():
        user = serializer.object.get('user') or request.user
        token = serializer.object.get('token')
        pass
```

`JSONWebTokenSerializer`的`validate`方法中，`token`是函数调用`jwt_encode_handler(payload)`的返回值，其中`payload = jwt_payload_handler(user)`，这里的逻辑比较清晰，就是base64编码一下。

```py
def jwt_payload_handler(user):
    username_field = get_username_field()
    username = get_username(user)

    warnings.warn(
        'The following fields will be removed in the future: '
        '`email` and `user_id`. ',
        DeprecationWarning
    )

    payload = {
        'user_id': user.pk,
        'username': username,
        'exp': datetime.utcnow() + api_settings.JWT_EXPIRATION_DELTA
    }
    if hasattr(user, 'email'):
        payload['email'] = user.email
    if isinstance(user.pk, uuid.UUID):
        payload['user_id'] = str(user.pk)

    payload[username_field] = username

    # Include original issued at time for a brand new token,
    # to allow token refresh
    if api_settings.JWT_ALLOW_REFRESH:
        payload['orig_iat'] = timegm(
            datetime.utcnow().utctimetuple()
        )

    if api_settings.JWT_AUDIENCE is not None:
        payload['aud'] = api_settings.JWT_AUDIENCE

    if api_settings.JWT_ISSUER is not None:
        payload['iss'] = api_settings.JWT_ISSUER

    return payload

def jwt_encode_handler(payload):
    key = api_settings.JWT_PRIVATE_KEY or jwt_get_secret_key(payload)
    return jwt.encode(
        payload,
        key,
        api_settings.JWT_ALGORITHM
    ).decode('utf-8')

```

## Django Session校验浅析

<h4 style="color: purple;">一句话概括：先从请求头信息`cookies`中取到sessionid，其对应`django_session`表结构中的`session_key`，那么对包含主要用户信息的`session_value`进行解码，再以后者查询到用户信息表`auth_user`的主键id，若该主键id存在且通过`校验方法`，则返回`用户详细信息`，否则返回`AnonymousUser`的匿名用户标志。</h4>

先定位到`setting.py`文件的`MIDDLEWARE`。

```py
MIDDLEWARE = [
  'django.contrib.sessions.middleware.SessionMiddleware',
  'django.contrib.auth.middleware.AuthenticationMiddleware',
]
```

1. 首先看一下`SessionMiddleware`类方法的请求拦截，其结果会给request添加session属性

```py
def process_request(self, request):
  # 从cookie中取出sessionid对应的值
  session_key = request.COOKIES.get(settings.SESSION_COOKIE_NAME)
  # 全局配置 SESSION_ENGINE = 'django.contrib.sessions.backends.db'
  # self.SessionStore = db.SessionStore类实例化并赋值给 request.session
  request.session = self.SessionStore(session_key)
  # request.session的赋值和序列化相关源码参考 https://www.cnblogs.com/liuwei0824/p/8527198.html
```

2. `AuthenticationMiddleware`中间件，只有一个请求拦截

先断言`session`属性的存在，随后执行`get_user(request)`方法，这里是惰性的

```py
def process_request(self, request):
    assert hasattr(request, 'session'), (
        "The Django authentication middleware requires session middleware "
        "to be installed. Edit your MIDDLEWARE%s setting to insert "
        "'django.contrib.sessions.middleware.SessionMiddleware' before "
        "'django.contrib.auth.middleware.AuthenticationMiddleware'."
    ) % ("_CLASSES" if settings.MIDDLEWARE is None else "")
    request.user = SimpleLazyObject(lambda: get_user(request))
```

`get_user`方法会直接调用`auth`模块的`get_user(request)`方法

```py
def get_user(request):
    if not hasattr(request, '_cached_user'):
        request._cached_user = auth.get_user(request)
    return request._cached_user
```

先来整理一下两个分支方法逻辑：

来看一下`django.session`表，分别有`session_key`和`session_data`，后者经`base64.decode`解码可以获取到用户信息。这里`get_user_model`方法拿到`auth_user`表，并对`request.session['_auth_user_id']`进行`auth_user`的主键查询。

```py
def _get_user_session_key(request):
    # This value in the session is always serialized to a string, so we need
    # to convert it back to Python whenever we access it.
    return get_user_model()._meta.pk.to_python(request.session[SESSION_KEY])
def get_user_model():
    """
    Returns the User model that is active in this project.
    """
    return django_apps.get_model(settings.AUTH_USER_MODEL, require_ready=False)
```

这里便是获取`auth_user`的用户信息并返回

```py
# auth.get_user方法
def get_user(request):
    """
    Returns the user model instance associated with the given request session.
    If no user is retrieved an instance of `AnonymousUser` is returned.
    """
    # 匿名User，表示查找user失败
    from .models import AnonymousUser
    user = None
    try:
        # 获取到auth_user表用户的主键id
        user_id = _get_user_session_key(request)
        # 获取到 自定义认证类，你可以在这个类里重写authentication方法
        backend_path = request.session[BACKEND_SESSION_KEY]
    except KeyError:
        pass
    else:
        # 如果通过校验逻辑，则返回用户信息；否则标志为匿名用户
        if backend_path in settings.AUTHENTICATION_BACKENDS:
            backend = load_backend(backend_path)
            user = backend.get_user(user_id)
            # Verify the session
            if hasattr(user, 'get_session_auth_hash'):
                session_hash = request.session.get(HASH_SESSION_KEY)
                session_hash_verified = session_hash and constant_time_compare(
                    session_hash,
                    user.get_session_auth_hash()
                )
                if not session_hash_verified:
                    request.session.flush()
                    user = None

    return user or AnonymousUser()
```

## DRF Token存取浅析

DRF的token，本质还是存储在数据库的Session形式。

相关配置参考[DRF的Authentication模块API：TokenAuthentication](https://www.django-rest-framework.org/api-guide/authentication/#tokenauthentication)。

### Token 生成

Token建表，先看一下`rest_framework.authtoken.views.ObtainAuthToken`，逻辑比较清晰

```py
class ObtainAuthToken(APIView):
    throttle_classes = ()
    permission_classes = ()
    parser_classes = (parsers.FormParser, parsers.MultiPartParser, parsers.JSONParser,)
    renderer_classes = (renderers.JSONRenderer,)
    serializer_class = AuthTokenSerializer

    def post(self, request, *args, **kwargs):
        # 根据请求体参数，生成json
        serializer = self.serializer_class(data=request.data)
        # 规则校验
        serializer.is_valid(raise_exception=True)
        # 校验user是否存在
        user = serializer.validated_data['user']
        # 获取或新建 token
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key})
```

在先期获取到Token并添加到请求头字段`Authorization: Token xxxxxxxxxxx`后，`rest_framework.authentication.TokenAuthentication`类是怎样获得用户信息的？

### Token 校验

来先看一下`TokenAuthentication`类的`authenticate`方法

```py
def authenticate(self, request):
    # 从请求头中取到 AUTHORIZATION 字段，源码见下文
    auth = get_authorization_header(request).split()
    # 若 auth 格式不合法，抛出 状态码401异常
    if not auth or auth[0].lower() != self.keyword.lower().encode():
        return None

    if len(auth) == 1:
        msg = _('Invalid token header. No credentials provided.')
        raise exceptions.AuthenticationFailed(msg)
    elif len(auth) > 2:
        msg = _('Invalid token header. Token string should not contain spaces.')
        raise exceptions.AuthenticationFailed(msg)

    try:
        # len(auth) == 2合规，取到 Token 字符串
        token = auth[1].decode()
    except UnicodeError:
        msg = _('Invalid token header. Token string should not contain invalid characters.')
        raise exceptions.AuthenticationFailed(msg)
    # 查找到用户详细信息，该辅助函数见下文
    return self.authenticate_credentials(token)
```

辅助函数`get_authorization_header`用于从请求头获取`AUTHORIZATION`字段，
`authenticate_credentials`直接以之查`authtoken_token`表

```py
def get_authorization_header(request):
    """
    Return request's 'Authorization:' header, as a bytestring.

    Hide some test client ickyness where the header can be unicode.
    """
    auth = request.META.get('HTTP_AUTHORIZATION', b'')
    if isinstance(auth, text_type):
        # Work around django test client oddness
        auth = auth.encode(HTTP_HEADER_ENCODING)
    return auth

def authenticate_credentials(self, key):
    # 这个model就是 rest_framework.authtoken.models，也就是 authtoken_token 表
    model = self.get_model()
    try:
        # 从 authtoken_token 表中查找用户key，而key正是对应user_id
        token = model.objects.select_related('user').get(key=key)
    except model.DoesNotExist:
        raise exceptions.AuthenticationFailed(_('Invalid token.'))

    if not token.user.is_active:
        raise exceptions.AuthenticationFailed(_('User inactive or deleted.'))
    # 返回用户详细信息 和 token的元组
    return (token.user, token)
```
