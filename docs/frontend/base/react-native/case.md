---
title: 'case'
date: '2020-04-24'
---

## WebView

- 描述：Android打开WebView出现net::ERR_UNKNOWN_URL_SCHEME错误
- 解决：http/https协议url在本页用webview进行加载，自定义协议的链接跳转，交给系统浏览器处理。

<details>
<summary>解决：Android打开WebView出现net::ERR_UNKNOWN_URL_SCHEME错误</summary>

```java
// MyWebViewManager.java
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;

import com.facebook.react.uimanager.ThemedReactContext;
import com.reactnativecommunity.webview.RNCWebViewManager;

class MyWebViewManager extends RNCWebViewManager {
    private static class MyWebViewClient extends RNCWebViewManager.RNCWebViewClient {
        private ThemedReactContext mContext;

        private MyWebViewClient(ThemedReactContext context) {
            this.mContext = context;
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.proceed();
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri mUri = request.getUrl();
            String scheme = mUri.getScheme();
            if("http".equalsIgnoreCase(scheme) ||
                    "https".equalsIgnoreCase(scheme)) {
                return false;
            } else {
                handleNonHttpSchemes(mUri);
                return true;
            }
        }

        private void handleNonHttpSchemes(Uri mUri) {
            Intent intent = new Intent(Intent.ACTION_VIEW, mUri);
            mContext.startActivity(intent);
        }
    }
}
```

```java
// MyWebViewPackage.java；并在MainApplication.mReactNativeHost.getPackages注册
import java.util.Collections;
import java.util.List;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import com.reactnativecommunity.webview.RNCWebViewPackage;

public class MyWebViewPackage extends RNCWebViewPackage {
    @Override
    @NonNull
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        MyWebViewManager manager = new MyWebViewManager();
        return Collections.singletonList(manager);
    }
}
```

</details>
