# Django REST framework

以下均称之为`DRF`，[官方文档](https://www.django-rest-framework.org/)。

源码路径备份`cd ~/.virtualenvs/py3django/lib/python3.7/site-packages/rest_framework`。

## 自动生成API文档

如官网描述，安装成功`coreapi`之后，就可使用DRF的文档功能了。

```py
# rest_framework app要先安装，即配置setting.py选项 INSTALLED_APPS 中
from rest_framework.documentation import include_docs_urls
# urls.py文件中 配置url访问路径，注意docs正则不要写成 ^docs/$
# urlpatterns中添加选项
urlpatterns = [
  url('^docs/', include_docs_urls(title='API文档')),
  # 如官网描述，登录配置
  url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
]
```

## Serialization 定制

rest_framework提供 `serializers` 和 `serializers.ModelSerializer` [API](https://www.django-rest-framework.org/tutorial/1-serialization/)，类似django的原生API `Form`和`ModelForm`，均可自由定制字段。

## APIView、GenericView、ViewSet和Router关系整理

> GenericViewSet(viewset)   - drf（router绑定，GenericAPIView的升级版）
>> GenericAPIView(generic)  - drf（你可以尽情使用这些被Mixins过的GenericAPIView，除非它们不满足需求）
>>> APIView(views)          - drf
>>>> View                   - django

在第二步GenericAPIView中，差异均来自mixins。

> mixins
>> CreateModelMixin：定义了create方法，创建一条数据。
>>> 
>> ListModelMixin：定义了list方法，实现了filter_queryset过滤以及paginate_queryset分页。
>>> 
>> RetrieveModelMixin：定义了retrieve方法，获取某一条数据详细信息，实现了get_object获取。
>>> 
>> UpdateModelMixin：定义了update方法，实现了部分或全量更新逻辑。
>>> 
>> DestoryModelMixin：定义了destroy方法，以连接delete，如返回状态码204.
>>> 
回到第一步`GenericViewSet`。升级范围：其无需如`GenericAPIView`那样以`请求方法+mixins派生类方法`在业务逻辑中绑定了。
请看以下两种方法:

1. 以url配置时默认绑定，即进行router的默认绑定(router.register)
2. 以url配置时动态绑定，手动调用GenericViewSet.as_view方法，传入参数如{'get': 'list'}

这两种，很显然第一种更易用，其原因正是`GenericViewSet`继承了`ViewSetMixin`，而后者重写了`as_view`方法。

同时`ViewSetMixin`重写了`initialize_request`方法，绑定了很多`action`，使得`动态serializers`更易用。
