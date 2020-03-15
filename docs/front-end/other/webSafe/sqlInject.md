# SQL注入攻击

## SQL注入的危害

非法读取、篡改、删除数据库中的数据，盗取敏感信息，甚至注入木马等，危害极大。

## SQL注入的攻击方式

**在查询参数里加入了SQL语句**。

```sql
-- 这是一个简单的sql查询语句
use myDataBase;
select * from blogs where name='zhangsan' and keyword like '%guan%';
```

```js
// Node.js
const mysql = require('mysql')
const MYSQL_CONF = {host, user, password, port, database}
const con = mysql.createConnection(MYSQL_CONF)
con.connect()
const sql = `select * from blogs where name='${name}' and keyword like '%${keyword}%'; `
con.query(sql, (err, result) => {...})
```

```py
# python
import MySQLdb
MYSQL_CONF = {host:'127.0.0.1', user:'root', passwd:'1', port:'3306', db:'haha', charset:'utf8'}
con = MySQLdb.connect(**MYSQL_CONF)
cursor = con.cursor()
sql = "select * from blogs where name='{0}' and keyword like '%{1}%';".format(name, keyword)
cursor.execute(sql)
result = cursor.fetchall()
```

这时，假设输入`' or 1=1 #`，那么便查出了该表的全部数据。

## SQL注入防范

**转义为特殊字符**。如Django ORM（Python）之Model类，npm包mysql（Node.js）的escape方法。
