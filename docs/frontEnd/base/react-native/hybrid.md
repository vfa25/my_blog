---
title: '混合编程'
---

# Native Modules

## 1. 编写Nation Module

```java
package com.vfa25.hybrid.module;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter;

public class MyReactJavaModule extends ReactContextBaseJavaModule {
    private ReactApplicationContext mReactContext;

    public MyReactJavaModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mReactContext = reactContext;
    }

    @Override
    public String getName() {
        return "MyReactJavaModule";
    }

    protected void emitEvent(String eventName, WritableMap params) {
        mReactContext.getJSModule(RCTDeviceEventEmitter.class).emit(eventName, params);
    }
}
```

## 2. 注册Native Module

先编写类AdapterPackage实现ReactPackage接口

```java
package com.vfa25;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

public class AdapterPackage implements ReactPackage {
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new com.vfa25.hybrid.module.MyReactJavaModule(reactContext));
        return modules;
    }
}
```

## 3. 在JavaScript中调用

```js
import { NativeModules } from 'react-native';
module.exports = NativeModules.MyReactJavaModule;
```
