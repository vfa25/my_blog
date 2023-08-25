# 新建用户及授权

意义：创建授权账号是必须的，出于安全等考虑，部署Web服务基本不会用root权限，
本篇是配置授权用户加入sudo组，配置成功后，随后的一切操作配置则可以由该授权账号进行。

另外需注意，使用0-1024之间的端口需要root权限，即包括nginx代理常用的80和443端口。
切换用户命令为`su`，查看当前账号用户组命令为`groups`。

以下命令行操作，建议输入法在英文状态下。

## 新建用户

root权限下，创建新用户，一定要记住`密码`，且该密码不必和root相同：

```sh
adduser my_manager
```

提示如下：

```md
Adding user `my_manager' ...
Adding new group `my_manager' (1000) ...
Adding new user `my_manager' (1000) with group `my_manager' ...
Creating home directory `/home/my_manager' ...
Copying files from `/etc/skel' ...
Enter new UNIX password: 
Retype new UNIX password: 
passwd: password updated successfully
Changing the user information for my_manager
Enter the new value, or press ENTER for the default
  Full Name []:
  Room Number []:
  Work Phone []:
  Home Phone []:
  Other []:
Is the information correct? [Y/n] y
```

- 简单的提权配置，即通过`gpasswd`让该用户以`sudo`方式调用系统命令。

    ```sh
    gpasswd -a my_manager sudo
    ```

- 赋予ubuntu:ubuntu用户、对某文件夹的所有权

    ```sh
    sudo chown -R ubuntu:ubuntu /var/www/demoapp/
    ```

## 账号授权提权

- 在 **visudo 权限配置文件**里进行配置：

  ``` sh
  sudo visudo
  ```

- 在打开的权限配置文件里，可以在root行之后，加入 **my_manager ALL=(ALL:ALL) ALL**
  > 第一个All：指定，这条规则对`所有宿主`生效

  > 第二个All：my_manager可以以`任何用户`来执行命令

  > 第三个All：my_manager可以以`任何组`来执行命令

  > 最后一个ALL：是这个规则适用于所有命令

  > 总之， my_manager 可以跟 root 一样，只要提供密码，就可以通过 sudo 运行任何命令。

  > 另外，%admin 和 %sudo 前面加个百分号，是指`用户组`的名字

- **保存** `ctrl+x` `shift+y` `回车`。

- 此时，`ssh my_manager@47.110.224.7`已经可以登陆了。

- 保险起见，可以先在root用户下重启ssh服务 `service ssh restart`。

  > 如果出现报错提示

  ```sh
  sudo vim /etc/ssh/sshd_config
  sudo: unable to resolve host iZbp162mggaelqtp8plk48Z
  ```

  > 即host无法解析，可以通过执行如下命令：

  ```sh
  echo $(hostname -I | cut -d\  -f1) $(hostname) | sudo tee -a /etc/hosts
  ```

  > 或者编辑hosts文件，加入这一行：

  ```md
  sudo vi /etc/hosts
  127.0.0.1 localhost iZbp162mggaelqtp8plk48Z
  ```

  > 然后重新登录，即`ssh my_manager@47.110.224.7`。

## 配置无密码登录

概括就是，首先在本地和服务器端各自生成`公钥 私钥`，然后在服务端`~/.ssh/authorized_keys`里添加公钥串。

- 以下为秘钥生成方式，若有使用过GitHub则跳过进行该步骤。（电脑本地环境下）

  ```sh
  # 1. 创建.ssh文件夹
  mkdir ~/.ssh
  cd ~/.ssh
  # 2. 秘钥生成，无需设置密码，命令执行完后会有id_rsa id_rsa.pub两个文件
  ssh-keygen -t rsa -b 4096 -C "邮箱（可以随便填写）"
  # 3. 开启ssh代理
  eval "$(ssh-agent -s)"
  # 4. 将ssh key添加入ssh代理中
  ssh-add ~/.ssh/id_rsa
  # 5. 查看公钥文件
  cat ~/.ssh/id_rsa.pub
  ```

- 上述本地执行完毕后，切换到服务器 **新创建用户账号**，不要用root，后面会配置禁止root权限ssh登录，安全。
  
  再度执行上述234命令，随后创建或编辑`授权文件`

  ```sh
  # 打开服务端授权文件
  sudo vim ~/.ssh/authorized_keys
  # 将上述第5步的公钥文件command+v复制进来，:wq保存。
  # vi常用命令：i编辑状态, esc退出编辑状态, :q不保存退出, :wq保存退出, 后两个+!表示强制退出，如”:wq!“
  # 重启ssh
  sudo service ssh restart
  # 如果文件不生效，则进行用户的rw可读授权，再重启ssh
  chmod 600 ~/.ssh/authorized_keys
  # 仍不生效可修改ssh配置文件 sudo vim /etc/ssh/sshd_config
  改 \#StrictModes yes 为 StrictModes no
  ```

- 此时再打开新端口，如果前几步正确，执行`ssh my_manager@47.110.224.7`，应可以进行无密码登录了。
