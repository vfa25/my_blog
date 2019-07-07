# 基本配置

- **服务器版本**

  建议直接选择18.04版本，或者低版本登录进去，会有如下提示：

  ```sh
  New release '18.04.1 LTS' available.
  Run 'do-release-upgrade' to upgrade to it.
  ```

  系统升级到最新可能会有很多问题，建议慎重执行`do-release-upgrade`，除非是裸服务器，
  随后可以全Y，并在升级完成后重启服务器。

- **首次ssh连接, root权限**

  ```sh
  ssh root@47.110.224.7
  ```

  若出现以下提示，`rm /Users/nsky/.ssh/known_hosts`即可

  ```sh
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  @    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
  Someone could be eavesdropping on you right now (man-in-the-middle attack)!
  It is also possible that a host key has just been changed.
  The fingerprint for the ECDSA key sent by the remote host is
  SHA256:uIlIWiw2zbWjzOgd5TvH2k0OgLN7XbSth+m5hGpQoSU.
  Please contact your system administrator.
  Add correct host key in /Users/nsky/.ssh/known_hosts to get rid of this message.
  Offending ECDSA key in /Users/nsky/.ssh/known_hosts:7
  ECDSA host key for 47.110.224.7 has changed and you have requested strict checking.
  Host key verification failed.
  ```

  若出现以下提示，意为无法确认host主机真实性，只知道其公钥指纹，是否继续连接。输入`yes`即可

  ```sh
  The authenticity of host '47.110.224.7 (47.110.224.7)' can't be established.
  ECDSA key fingerprint is SHA256:uIlIWiw2zbWjzOgd5TvH2k0OgLN7XbSth+m5hGpQoSU.
  Are you sure you want to continue connecting (yes/no)?
  ```

  随后输入登录密码

  ```sh
  Warning: Permanently added '47.110.224.7' (ECDSA) to the list of known hosts.
  root@47.110.224.7's password:
  ```

- **查看操作系统版本**

  ``` sh
  sudo lsb_release -a
  ```

- **更新包和依赖**

  ``` sh
  sudo apt-get update
  ```

  - 先试着装一些底层库，如node-canvas依赖的库

    ``` sh
    sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
    ```

  - 常用开发者套件

    ``` sh
    sudo apt-get install -y software-properties-common 
    ```

  - FFmpeg 处理视频图片的库

    ``` sh
    sudo add-apt-repository ppa:jonathonf/ffmpeg-4
    sudo apt-get update
    sudo apt-get install ffmpeg
    ffmpeg -version
    # ffmpeg version 4.1.3-0york1~18.04 Copyright (c) 2000-2019 the FFmpeg developers
    # built with gcc 7 (Ubuntu 7.3.0-27ubuntu1~18.04)
    ```

- **数据盘**

  - 查看是否有数据盘

    ``` sh
    fdisk -l
    ```

  - 查看硬盘使用情况

    ``` sh
    df -h
    ```
