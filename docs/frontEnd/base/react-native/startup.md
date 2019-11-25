---
title: "启动流程"
date: "2019-11-20"
sidebarDepth: 3
---

React Native(V0.61.4)

## 一. 应用初始化流程

将以/react-natve/template的Demo为例，从外部JS代码起步，了解内部的逻辑。

```json
// demo的依赖，缺少了两个，安装启动后，界面如下图
"@react-native-community/cli-platform-android": "^2.9.0",
"@react-native-community/cli-platform-ios": "^2.9.0",
```

![Demo截屏](../../../.imgs/react_native_demo_screenshots.jpg)

1. 首先会在应用的 MainApplication 里做RN的初始化操作。

    MainApplication 里继承 Application 实现了 ReactApplication 接口，该接口要求创建一个ReactNativeHost对象，后者持有ReactInstanceManager实例，并做了一些初始化操作。

    ```java
    public interface ReactApplication {
      /** Get the default {@link ReactNativeHost} for this app. */
      ReactNativeHost getReactNativeHost();
    }
    ```

    ```java
    public class MainApplication extends Application implements ReactApplication {

      // ReactNativeHost类（private @Nullable ReactInstanceManager mReactInstanceManager），
      // 持有ReactInstanceManager实例，后者正是ReactNative应用总的管理类。
      private final ReactNativeHost mReactNativeHost =
        // 在创建 ReactNativeHost 实例时，Override重写了里面的几个方法，这些方法提供一些初始化信息
        new ReactNativeHost(this) {

          // 是否开启dev模式，dev模式下会有一些调试工具，例如红盒
          @Override
          public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
          }

          // 返回app需要的ReactPackage，包括：
          // NativeModule（官网Demo之Toast模块就是加在这里——https://reactnative.cn/docs/native-modules-android/）
          // JavaScriptModule以及ViewManager
          @Override
          protected List<ReactPackage> getPackages() {
            @SuppressWarnings("UnnecessaryLocalVariable")
            List<ReactPackage> packages = new PackageList(this).getPackages();
            // Packages that cannot be autolinked yet can be added manually here, for example:
            packages.add(new MyReactNativePackage());
            return packages;
          }

          @Override
          protected String getJSMainModuleName() {
            return "index";
          }
        };

      @Override
      public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
      }

      @Override
      public void onCreate() {
        super.onCreate();
        // SoLoader：加载C++底层库，准备解析JS。
        SoLoader.init(this, /* native exopackage */ false);
      }
      // ...
    }
    ```

    ReactNativeHost主要的工作就是创建了ReactInstanceManager，它将一些信息传递给了ReactInstanceManager。

    ```java
    public abstract class ReactNativeHost {
      protected ReactInstanceManager createReactInstanceManager() {
        ReactMarker.logMarker(ReactMarkerConstants.BUILD_REACT_INSTANCE_MANAGER_START);
        ReactInstanceManagerBuilder builder =
          ReactInstanceManager.builder()
            // 应用上下文，Application instance
            .setApplication(mApplication)
            // setJSMainModulePath 传递url以从打包服务器拉取js Bundle的js应用入口
            // 仅在dev模式下有效，一般都是默认的"index"
            .setJSMainModulePath(getJSMainModuleName())
            // 是否开启dev模式
            .setUseDeveloperSupport(getUseDeveloperSupport())
            // 红盒的回调
            .setRedBoxHandler(getRedBoxHandler())
            // 自定义JSExecutor，忽略
            .setJavaScriptExecutorFactory(getJavaScriptExecutorFactory())
            // 自定义UI实现机制，忽略
            .setUIImplementationProvider(getUIImplementationProvider())
            .setJSIModulesPackage(getJSIModulePackage())
            .setInitialLifecycleState(LifecycleState.BEFORE_CREATE);

        // 添加ReactPackage，无法自动链接的包可以在 getPackages 手动添加
        for (ReactPackage reactPackage : getPackages()) {
          builder.addPackage(reactPackage);
        }

        //获取js Bundle的加载路径
        String jsBundleFile = getJSBundleFile();
        if (jsBundleFile != null) {
          builder.setJSBundleFile(jsBundleFile);
        } else {
          builder.setBundleAssetName(Assertions.assertNotNull(getBundleAssetName()));
        }
        ReactInstanceManager reactInstanceManager = builder.build();
        ReactMarker.logMarker(ReactMarkerConstants.BUILD_REACT_INSTANCE_MANAGER_END);
        return reactInstanceManager;
      }
    }
    ```

2. 页面继承ReactActivity，ReactActivity作为JS页面的容器。

    ```java
    public class MainActivity extends ReactActivity {

      /**
      * Returns the name of the main component registered from JavaScript. This is used to schedule
      * rendering of the component.
      */
      @Override
      protected String getMainComponentName() {
        // 返回组件名
        return "HelloWorld";
      }
    }
    ```

3. 有了ReactActivity作为容器，就可以用JS开发页面了。

    ```js
    import React from 'react';
    import { AppRegistry, StyleSheet, Text, View } from 'react-native';

    const App: () => React$Node = () => {
      return (
        <View>
          <Text>TODO：UI渲染（JSX语法）</Text>
        </View>
      );
    };

    const styles = StyleSheet.create({
      // TODO: 创建CSS样式
    });

    // 注册组件名，JS与Java格子各自维护了一个注册表
    AppRegistry.registerComponent('HelloWorld', () => App);
    ```

## 二. 应用启动流程

> 一句话概括启动流程：先是应用终端启动并创建应用上下文，应用上下文启动JS Runtime，进行布局，再由应用终端进行渲染，最后将渲染的View添加到ReactRootView上，最终呈现在用户面前。

![应用启动流程概览](../../../.imgs/react_native_start_flow_structure.png)

<p style="background-color:cyan;line-height:50px;text-align:center;border-radius:5px;" height="50px">即将进入Java层</p>

首先，从ReactActivity入手。ReactActivity基于Activity，并实现了它的生命周期方法。且所有的功能都由它的委托类 ReactActivityDelegate 来完成。

所以主要来关注 ReactActivityDelegate 的实现。先来看看 ReactActivityDelegate 的 onCreate() 方法。

### 2.1 ReactActivityDelegate.onCreate(Bundle savedInstanceState)

```java
public class ReactActivityDelegate {

  private final @Nullable Activity mActivity;
  private final @Nullable String mMainComponentName;

  private ReactDelegate mReactDelegate;

  // 构造函数
  public ReactActivityDelegate(ReactActivity activity, @Nullable String mainComponentName) {
    mActivity = activity;
    mMainComponentName = mainComponentName;
  }

  protected void onCreate(Bundle savedInstanceState) {
    // 返回 this.mMainComponentName（可能会被重写）
    String mainComponentName = getMainComponentName();
    mReactDelegate =
        new ReactDelegate(
          // 返回构建函数时传入的上下文 this.mActivity
          getPlainActivity(),
          getReactNativeHost(),
          mainComponentName,
          getLaunchOptions()
        ) {
          @Override
          protected ReactRootView createRootView() {
            return ReactActivityDelegate.this.createRootView();
          }
        };

    // mMainComponentName：实例化时传递的组件名
    if (mMainComponentName != null) {
      // 载入app页面
      loadApp(mainComponentName);
    }
  }

  protected void loadApp(String appKey) {
    mReactDelegate.loadApp(appKey);
    // Activity的setContentView()方法
    getPlainActivity().setContentView(mReactDelegate.getReactRootView());
  }
}
```

```java
public class ReactDelegate {

  private ReactRootView mReactRootView;
  @Nullable private final String mMainComponentName;

  public ReactRootView getReactRootView() {
    return mReactRootView;
  }

  public void loadApp() {
    loadApp(mMainComponentName);
  }

  public void loadApp(String appKey) {
    if (mReactRootView != null) {
      throw new IllegalStateException("Cannot loadApp while app is already running.");
    }
    // 创建ReactRootView作为根视图,它本质上是一个FrameLayout
    mReactRootView = createRootView();
    // 启动RN应用
    mReactRootView.startReactApplication(
        getReactNativeHost().getReactInstanceManager(), appKey, mLaunchOptions);
  }

  protected ReactRootView createRootView() {
    return new ReactRootView(mActivity);
  }
}
```

可以发现ReactActivityDelegate在创建时主要做了以下事情：

```md
1. 创建ReactRootView作为应用的容器，它本质上是一个FrameLayout（安卓布局之帧布局）。
2. 调用ReactRootView.startReactApplication()进一步执行应用启动流程。
3. 调用Activity.setContentView()将创建的ReactRootView作为ReactActivity的content view。
```

**RN真正核心的地方就在于ReactRootView，它就是一个View，可以像用其他UI组件那样把它用在Android应用的任何地方。**

来进一步去ReactRootView看启动流程。

### 2.2 startReactApplication(ReactInstanceManager reactInstanceManager,String moduleName,@Nullable Bundle initialProperties,@Nullable String initialUITemplate)
