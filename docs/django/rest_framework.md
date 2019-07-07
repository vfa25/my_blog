# Django REST framework

以下均称之为`DRF`，[官方文档](https://www.django-rest-framework.org/)。

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

rest_framework提供 `serializers` 和 `serializers.ModelSerializer` [API](https://www.django-rest-framework.org/tutorial/1-serialization/)，类似django的API `Form`和`ModelForm`，均可自由定制字段。
