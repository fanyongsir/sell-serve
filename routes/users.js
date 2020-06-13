const express = require("express");
const router = express.Router();
var multer = require("multer");

const conn = require("./db/conn");


/**
 * 头像上传
 */
let picName = '';
const storage = multer.diskStorage({
  destination: "public/upload/imgs/acc_img", //
  filename: function (req, file, cb) {
    const fileFormat = file.originalname.split(".");
    const filename = new Date().getTime();
    cb(null, filename + "." + fileFormat[fileFormat.length - 1]); // 拼接文件名
    picName = filename + "." + fileFormat[fileFormat.length - 1]
  },
});

const upload = multer({
  storage,
});

/* 头像上传接口 */
router.post("/avatar_upload", upload.single("file"), (req, res) => {
  let { file } = req.body;
  // console.log(req.body)
  res.send({ code: 0, msg: "上传成功!", imgUrl: picName });
});

/**
 * token鉴权
 */
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const secretKey = "itsource";

//router.use(
//  expressJwt({
//    secret: secretKey,
//  }).unless({
//    path: ["/users/checkLogin", "/users/avatar_upload"], // 不需要验证token的地址
//  })
//);

// 拦截器
//router.use(function (err, req, res, next) {
//  if (err.name === "UnauthorizedError") {
//    res.status(401).send({ code: 401, msg: "无效的token" });
//  }
//});

/**
 * 登录请求
 */
router.post("/checkLogin", (req, res) => {
  let { account, password } = req.body;
  if (!(account && password)) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }
  const sql = `select * from users where account="${account}" and password="${password}"`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    if (data.length) {
      const userInfo = { ...data[0] };
      const token =
        jwt.sign(userInfo, secretKey, {
          expiresIn: 60 * 60 * 3
        });

      let role;
      if (data[0].userGroup === "超级管理员") {
        role = "super";
      } else {
        role = "normal";
      }

      res.send({
        code: 0,
        msg: "欢迎你，登录成功",
        token,
        id: data[0].id,
        role,
      });
    } else {
      res.send({ code: 1, msg: "登录失败，请检查用户名或密码" });
    }
  });
});

/**
 * 当前角色
 */
router.get("/role", (req, res) => {
  let role;
  if (req.user.userGroup === "超级管理员") {
    role = "super";
  } else {
    role = "normal";
  }
  res.send({ role });
});

/**
 * 账号重名检测
 */
router.get('/checkAccountRepeat', (req, res) => {
  let { account } = req.query;
  if (!account) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }
  const sql = `select * from users where account="${account}"`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    console.log(data);
    if (data.length > 0) {
      res.send({ code: 1, msg: "账号名已存在，请更换!" });
    } else {
      res.send({ code: 0, msg: "账号名可用!" });
    }
  })
})

/**
 * 添加账号
 */
router.post("/add", (req, res) => {
  let { account, password, userGroup } = req.body;

  if (!(account && password && userGroup)) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }
  const sql = `insert into users(account, password, userGroup, imgUrl) values("${account}", "${password}", "${userGroup}", "default.jpg")`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    if (data.affectedRows > 0) {
      res.send({ code: 0, msg: "添加账号成功!" });
    } else {
      res.send({ code: 1, msg: "添加账号失败!" });
    }
  });
});

/**
 * 获取账号列表
 */
router.get("/list", (req, res) => {
  let { currentPage, pageSize } = req.query;
  if (!(currentPage && pageSize)) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }
  let sql = `select id,ctime,account,userGroup,imgUrl from users`;
  let total;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    total = data.length;

    let n = (currentPage - 1) * pageSize;
    sql += ` order by ctime desc limit ${n}, ${pageSize}`;
    conn.query(sql, (err, data) => {
      if (err) throw err;
      res.send({
        total,
        data,
      });
    });
  });
});

/**
 * 删除账号
 */
router.get("/del", (req, res) => {
  let { id } = req.query;
  if (!id) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }
  const sql = `delete from users where id = ${id}`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    if (data.affectedRows > 0) {
      res.send({ code: 0, msg: "删除成功!" });
    } else {
      res.send({ code: 1, msg: "删除失败!" });
    }
  });
});

/* 批量删除 */
router.get("/batchdel", (req, res) => {
  let { ids } = req.query;

  if (!ids) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }

  const sql = `delete from users where id in (${JSON.parse(ids).join(",")})`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    if (data.affectedRows > 0) {
      res.send({
        code: 0,
        msg: "批量删除成功!",
      });
    } else {
      res.send({
        code: 1,
        msg: "批量删除失败!",
      });
    }
  });
});

/**
 * 修改账号
 */
router.post("/edit", (req, res) => {
  let { account, userGroup, id } = req.body;
  if (!(account && userGroup && id)) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }
  const sql = `update users set account="${account}", userGroup="${userGroup}" where id=${id}`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    if (data.affectedRows > 0) {
      res.send({
        code: 0,
        msg: "修改账号成功!",
      });
    }
  });
});

/* 验证旧密码是否正确 */
router.get("/checkoldpwd", (req, res) => {
  let { oldPwd, id } = req.query;
  const sql = `SELECT * FROM users WHERE id=${id}`;
  conn.query(sql, (err, data) => { 
    if (err) throw err;
    if (!oldPwd || data.length == 0) {
      res.send({ code: 5001, msg: "参数错误!" });
      return;
    }
    if (oldPwd === data[0].password) {
      res.send({ code: "00", msg: "旧密码正确" });
    } else {
      res.send({ code: "11", msg: "原密码错误" });
    }
  })
});

/* 修改密码 */
router.post("/editpwd", (req, res) => {
  let { newPwd , id} = req.body;
  if (!newPwd) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }
  const sql = `update users set password="${newPwd}" where id=${id}`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    if (data.affectedRows > 0) {
      res.send({ code: 0, msg: "修改密码成功，请重新登录!" });
    } else {
      res.send({ code: 1, msg: "修改密码失败!" });
    }
  });
});

/* 个人中心 */
router.get("/accountinfo", (req, res) => {
  let { id } = req.query;
  const sql = `select id,ctime,account,userGroup,imgUrl from users where id=${id}`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    if (data.length) {
      data[0].imgUrl =
        "http://127.0.0.1:5000/upload/imgs/acc_img/" + data[0].imgUrl;
      res.send({ accountInfo: data[0] });
    }
  });
});

/* 修改用户头像 */
router.get("/avataredit", (req, res) => {
  let { imgUrl, id} = req.query;
  if (!imgUrl) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }
  const sql = `update users set imgUrl="${imgUrl}" where id=${id}`;
  conn.query(sql, (err, data) => {
    if (err) throw err;
    if (data.affectedRows > 0) {
      res.send({ code: 0, msg: "修改头像成功!" });
    } else {
      res.send({ code: 1, msg: "修改头像失败!" });
    }
  });
});

/* 验证token */
router.get("/checktoken", (req, res) => {
  let { token } = req.query;
  if (!token) {
    res.send({ code: 5001, msg: "参数错误!" });
    return;
  }

  // 解码 token (验证 secret 和检查有效期（exp）)
  jwt.verify(token, secretKey, function (err, decoded) {
    if (err) {
      res.send({ code: 1, msg: 'token无效/过期' });
    } else {
      res.send({ code: 0, msg: 'token有效' });
    }
  });

});

module.exports = router;
