var express =require('express');
var app = express();
var session = require('express-session');
require('date-utils');
var MySQLStore = require('express-mysql-session');
var bkfd2Password = require('pbkdf2-password');
var hasher = bkfd2Password();
var cookieParser = require('cookie-parser');
//connect database
var bodyParser = require('body-parser');
var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'test',
    dateStrings: 'date'
});
connection.connect();
app.use(bodyParser.urlencoded({exteded:false}));
app.locals.pretty = true;
app.use(session({
    key : 'session',
    secret : '1107',
    resave : true,
    saveUninitialized : false,
    cookie : {
      maxAge : 1000*60*60
    },
    store : new MySQLStore({
  host : 'localhost',
  port : 3306,
  user : 'root',
  password : '',
  database : 'test'
  })
}));
app.use(cookieParser());
//set view engine
app.set('views','./views_app');
app.set('view engine','jade');
app.use(express.static('views_app'));
app.use(express.static('views_app'));

app.get('/',function(req,res){
  if(req.session.user){
    res.redirect('/main');
  } else {
    res.redirect('/signIn');
  }
});

//signIn
app.get('/signIn',function(req,res){
    res.render('view_signIn');
});

app.post('/signIn', function(req,res){
    var sid = req.body.sid;
    var password = req.body.password;
    console.log(sid, password);

    connection.query('SELECT * FROM USERS WHERE Uid = ?', sid, function(error,results,fields){
        if(error) {
            console.log(error);
        } else {
            if(results.length > 0){
                console.log(results[0]);
                hasher({password:req.body.password, salt:results[0].salt}, function(err, pass, salt, hash){
                  if(results[0].password === hash) {
                    //login success
                    req.session.email = results[0].email;
                    req.session.Uid = results[0].Uid;
                    req.session.name = results[0].name;
                    req.session.phone = results[0].phone;
                    req.session.privilege = results[0].privilege;
                    req.session.user = results;
                    res.redirect('/');
                  } else {
                    res.render('view_alert2', {msg:"비밀번호가 일치하지 않습니다.", alertType:2});
                  }
                });
            } else {
                res.render('view_alert2', {msg:"존재하지 않는 아이디입니다.", alertType:1});
            }
        }
    });
});

//help id
app.get('/help/id', function(req,res){
    res.render('view_helpUser');
});

app.post('/help/id', function(req,res){
    var hid = req.body.student_id;
    connection.query('SELECT email FROM USERS WHERE Uid = ?', hid,
                    function(error,results,fields){
        if(error) {
            console.log(error);
        } else {
            if(results.length>0){
                res.render('view_alert2', {msg:results[0].email, alertType:1});
            } else {
                res.render('view_alert2', {msg:"존재하지 않는 학번입니다.", alertType:1});
            }
        }
    });
});

//help pw
app.get('/help/pw', function(req,res){
    res.render('view_helpuserpw');
});

app.post('/help/pw', function(req,res){
    var helpVar = [req.body.Uid, req.body.email];

    connection.query('SELECT password FROM USERS WHERE (Uid=? AND email=?)', helpVar,
                    function(error,results,fields){
        if(error) {
            console.log(error);
        } else {
            if(results.length>0){
              res.redirect('/mypage/editpw');
            } else {
                res.render('view_alert2', {msg:"ID(이메일)을 확인하세요.", alertType:1});
            }
        }
    });
});

//logout
app.get('/logout', function(req,res){
  req.session.destroy();
  res.clearCookie('session');
  delete req.session.email;
  delete req.session.Uid;
  delete req.session.name;
  delete req.session.phone;
  delete req.session.user;
  res.redirect('/');
})

//preview
app.get('/preview', function(req,res){
  res.render('view_preview');
});

//signUp
app.get('/signUp',function(req,res){
    res.render('view_signUp');
});


app.post('/signUp', function(req,res){
    var tid = req.body.student_id;
    var temail = req.body.email;
    console.log(req.body.phone_number);

    if(req.body.password === req.body.password2) { //비밀번호 불일치
      connection.query('SELECT * FROM USERS WHERE email = ?', temail, function(error, results, fields){
          if(error) { console.log(error); }
          else {
            if(results.length===0){ //데이터 없음 -->회원가입
              connection.query('SELECT * FROM USERS WHERE Uid=?', tid, function(error, results, fields){
                if(error) {console.log(error);}
                else {
                  if(results.length===0) {
                    var opts = {password:req.body.password};
                    hasher(opts, function(err, pass, salt, hash){
                      var hashUser = [req.body.email, hash, req.body.name, req.body.student_id, req.body.phone_number, salt];
                      console.log(hashUser);
                      connection.query('INSERT INTO USERS(email, password, name, Uid, phone, salt) VALUES(?,?,?,?,?,?)', hashUser,
                      function(error, result, fields){
                        if(error){
                          res.render('view_alert2', {msg:"정보가 입력되지 않았습니다.", alertType:1});
                        } else {
                          res.redirect('/signin');
                        }

                    });
                  });
                } else { res.render('view_alert2', {msg:"이미 존재하는 학번입니다.", alertType:1}); }
                }});
            } else { res.render('view_alert2', {msg:"이미 존재하는 ID(이메일)입니다.", alertType:1}); }
          }});
    } else {
      res.render('view_alert2', {msg:"비밀번호가 일치하지 않습니다.", alertType:1});
    }
});

//main
app.get('/main', function(req,res) {
    if(!req.session.user){
      res.redirect('/signIn');
    }
    if(req.session.privilege==3){
        res.render('view_alert', {msg:"관리자의 승인이 필요합니다"});
    }
    var studentID = req.session.Uid;
    var sql = 'SELECT Lid FROM LOCKER WHERE owner = ?';
    var sql2 = 'SELECT * FROM NOTICE WHERE Nid=1';
    var sql3 = 'SELECT * FROM SCHEDULE';
    var sql4 = 'SELECT * FROM LOCKER;';

    //A 1-22
    var sql5 = 'SELECT * FROM LOCKER WHERE Lid < 23 ORDER BY line';

    //B 23-52
    var sql6 = 'SELECT * FROM LOCKER WHERE Lid>22 AND Lid<53 ORDER BY line';

    //C 53-72
    var sql7 = 'SELECT * FROM LOCKER WHERE Lid>52 AND Lid<73 ORDER BY line, Lid DESC';

    //D 73-92
    var sql8 = 'SELECT * FROM LOCKER WHERE Lid>72 AND Lid <93 ORDER BY line';

    //E 93-112
    var sql9 = 'SELECT * FROM LOCKER WHERE Lid>92 AND Lid<113 ORDER BY line, Lid DESC';

    var sql10 = 'SELECT * FROM LOCKER WHERE Lid<3 ORDER BY line';
    var sql11 = 'SELECT extension FROM LOCKER WHERE owner = ?';
    connection.query(sql, studentID, function(error, result1, fields){
      if(error) {
          console.log(error);
      } else {
        connection.query(sql2, function(error, result2, fields){
          if(error){
            console.log(error);
          } else {
            connection.query(sql3, function(error,result3, fields){
              if(error){
                console.log(error);
              } else {
                  connection.query(sql4, function(error,result4, fields){
                      if(error){
                          console.log(error);
                      }else{
                          connection.query(sql5, function(error, result5, fields){
                              if(error){
                                  console.log(error);
                              } else {
                                  connection.query(sql6, function(error, result6, fields){
                                      if(error){
                                          console.log(error);
                                      } else{
                                          connection.query(sql7, function(error, result7, fields){
                                              if(error){
                                                  console.log(error);
                                              }else {
                                                  connection.query(sql8, function(error, result8, fields){
                                                      if(error) {
                                                          console.log(error);
                                                      }else {
                                                          connection.query(sql9, function(error, result9, fields){
                                                            if(error) {
                                                              console.log(error);
                                                            } else {
                                                              connection.query(sql10, function(error, result10, fields){
                                                                if(error){
                                                                  console.log(error);
                                                                } else {
                                                                  connection.query(sql11, studentID, function(error, result11, fields){
                                                                    if(error){
                                                                      console.log(error);
                                                                    } else {
                                                                      res.render('view_main', {locker:result1[0], extension:result11[0], notice:result2[0],
                                                                        privilege:req.session.privilege, schedule:result3,
                                                                        allLocker:result4, lockerSectionA:result5, lockerSectionB:result6,
                                                                        lockerSectionC:result7, lockerSectionD:result8, lockerSectionE:result9, lockerSectionA2: result10});
                                                                    }
                                                                  })
                                                                }
                                                              });
                                                            }
                                                          });
                                                      }
                                                  });
                                              }
                                          });
                                      }
                                  });
                              }
                          });
                      }
                  })
                }
              });
            }
          });
        }

      });
    }
);

app.post('/main', function(req,res){
    if(!req.session.user){
      res.redirect('/signIn');
    } else {}
    var lockNum = req.body.lockerNumber;
    var sql1 = 'SELECT usable FROM LOCKER WHERE Lid=?'
    var sql2 = 'UPDATE LOCKER SET owner=?, usable=0 WHERE Lid=?;'

    connection.query(sql1, lockNum, function(error, results, fields){
      if(error){
        console.log(error);
      } else {
        var objectResult = JSON.stringify(results[0]);
        if(objectResult[10]==='0'){
          res.send('a');
        } else {}
     connection.query(sql2, [req.session.Uid, req.body.lockerNumber], function(error, results, fields){
        if(error){
            console.log(error);
          } else {
            res.send('a');
          }
        });
      }
    });
});

app.post('/main/return', function(req,res){
  if(!req.session.user){
    res.redirect('/signIn');
  } else {}
  var user = req.session.Uid;
  var sql = 'UPDATE LOCKER SET usable=1, extension=2, owner=NULL WHERE owner=?;';
  connection.query(sql, user, function(error, results, fields){
    if(error){
      console.log(error);
    } else {
      res.redirect('/main');
    }
  });
});

app.get(['/main/extend','/main/extend?id:id'], function(req,res) {
    if(!req.session.user){
        res.redirect('/signIn');
    };
    var id = req.query.id;
    var nowDate = new Date();
    var sql1 = 'SELECT strDate, endDate FROM SCHEDULE WHERE Sid=2;'
    var sql2 = 'UPDATE LOCKER SET extension=1 WHERE Lid=?;';
    connection.query(sql1, function(err, results, fields) {
       if(err){
           console.log(err);
       }else {
           var strDate = new Date(results[0].strDate);
           var endDate = new Date(results[0].endDate);
           if(strDate.getDate() <= nowDate.getDate() && nowDate.getDate() <= endDate.getDate()){
                connection.query(sql2, id, function(err,results,fields){
                    if(err){
                        console.log(err);
                    }else{
                        res.redirect('/main');
                    }
                });
           }else{
               res.render('view_alert', {msg:"신청 기간이 아닙니다."});
           }
       }
    });
});

//main-enroll locker
app.get(['/main/enroll','/main/enroll?id:id'], function(req, res){
  console.log('enroll get access');
  var id = req.query.id;
  var sql1 = 'SELECT usable FROM LOCKER WHERE LID=?'
  var sql2 = 'UPDATE LOCKER SET owner=?, usable=0 WHERE lid=?;'

  var nowDate = new Date();
  var sql3 = 'SELECT strDate, endDate FROM SCHEDULE WHERE Sid=1;'

  connection.query(sql3, function(error, results, fields){
    if(error) {
      console.log(error);
    } else {
        var strDate = new Date(results[0].strDate);
        var endDate = new Date(results[0].endDate);
        console.log(nowDate, strDate, endDate);
        if(strDate <= nowDate && nowDate <= endDate) {
          connection.query(sql1, id, function(error, results, fields){
            if(error){
              console.log(error);
            } else {
              var objectResult = JSON.stringify(results[0]);
              if(objectResult[10]==='0'){ //results의 값을 확인 해야혀~!
                res.send('사용중인 사물함');
              } else {}
           connection.query(sql2, [req.session.Uid, id], function(error, results, fields){
              if(error){
                  console.log(error);
                } else {
                  res.redirect('/main');
                }
              });
            }
          });
        } else {
          res.render('view_alert', {msg:"신청 기간이 아닙니다."});
        }
    }
  });

});

app.post('/main/enroll?id=:id', function(req,res){
  console.log('enroll post access');
  var id = req.query.id;
  var lockNum = req.body.lockerNumber;
});

//notice
app.get(['/notice','/notice?id=:id'],function(req,res){
  if(!req.session.user){
    res.redirect('/signIn');
  } else {
      var sql_all = 'SELECT * FROM NOTICE ORDER BY Nid desc;'
      connection.query(sql_all, function(err, rows, fields){
          var id = req.query.id;
          var privilege = req.session.privilege;
          var authorName = req.session.name;
          if(id){
              var sql_detail = 'SELECT * FROM NOTICE WHERE Nid=?;';
              connection.query(sql_detail,[id],function(err, row, fields){
                  if(err){
                      console.log(err);
                      res.status(500).send('Internal Server Error');
                  }else {
                      var sql_comment = 'SELECT * FROM COMMENT WHERE Nid=?;';
                      connection.query(sql_comment, [id], function(err, row2, fields){
                        if(err){
                          console.log('Comment DB error');
                        }else {
                          console.log(row[0].description);
                          res.render('view_post', {post:row[0], desc:row[0].description, privilege:req.session.privilege, authorName:authorName,
                            allComment:row2});
                        }
                      });
                      //res.render('view_post',{post:row[0], privilege:req.session.privilege, authorName:authorName});
                  }
              });
          }else{
              res.render('view_notice',{topics:rows, privilege:req.session.privilege, authorName:authorName});
          };
      });
    }
});

app.post(['/notice/comment','/notice/comment?id=:id'], function(req, res){
  var nid = req.query.id;
  var c_content = req.body.c_content;
  var c_author = req.session.name;
  var sql = 'INSERT INTO COMMENT VALUES(?,?,?);';
  connection.query(sql, [nid, c_content, c_author], function(err, row, fields){
    if(err){
      console.log(err);
    }else {
      res.redirect('/notice?id='+nid);
    }
  });
});

//notice-add
app.get('/notice/add',function(req,res){
   res.render('view_addPost');
});

app.post('/notice/add',function(req,res){
    var title = req.body.title;
    var description = req.body.description;
    var author = req.session.name;
    var timestamp = req.body.timestamp;

    var sql = 'INSERT INTO NOTICE (title, description, author, timestamp) VALUES(?, ?, ?, ?);';
    connection.query(sql, [title, description, author, timestamp], function(err, rows, fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       } else{
           res.redirect('/notice')
       }
    });
});

//notice edit
app.get(['/notice/edit','/notice/edit?id=:id'],function(req,res){
    var id = req.query.id;
    var sql = 'SELECT * FROM NOTICE WHERE Nid=?;';
        connection.query(sql,[id],function(err, row, fields){
            if(err){
                console.log(err);
                res.status(500).send('Internal Server Error');
            }else {
                res.render('view_editPost',{post:row[0]});
            }
        });
});
app.post(['/notice/edit','/notice/edit?id=:id'],function(req,res){
    var id = req.query.id;
    var title = req.body.title;
    var description = req.body.description;
    var author = req.session.name;
    var sql = 'UPDATE NOTICE SET title=?, description=?, author=? WHERE Nid=?';
    connection.query(sql,[title, description, author, id], function(err,rows,fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       }else{
           res.redirect('/notice/?id='+id);
       }
    });
});

//notice delete
app.get(['/notice/delete','/notice/delete?id=:id'],function(req,res){
    var id = req.query.id;
    var sql = 'DELETE FROM NOTICE WHERE Nid=?;';
    connection.query(sql,[id],function(err, row, fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       }else{
           res.redirect('/notice');
       }
    });
});

//mypage
app.get('/mypage', function(req, res){
    if(!req.session.user){
      res.redirect('/signIn');
    } else {
    var user = req.session.Uid;
    res.render('view_mypage',{name:req.session.name, email:req.session.email,
                              phone_number:req.session.phone, studentID:user, privilege:req.session.privilege});}
});

//mtpage edit
app.get('/mypage/edit', function(req, res){
  if(!req.session.user){
    res.redirect('/signIn');
  } else {}
  var user = req.session.Uid;
  res.render('view_myedit',{name:req.session.name, email:req.session.email,
                            phone_number:req.session.phone, studentID:user});
});

app.post('/mypage/edit', function(req, res){
  var email = req.body.email;
  var name = req.body.name;
  var sid = req.session.Uid;
  var phone = req.body.phone_number;

  if(phone === ''){
    phone = req.session.phone;
  }
  if(email === ''){
    email = req.session.email;
  }
  if(name === ''){
    name = req.session.name;
  }
  var sql = 'UPDATE USERS SET email=?, name=?, phone=? WHERE Uid=?;'
  console.log(email, name, phone,sid);
  connection.query(sql, [email, name, phone, sid], function(error, result, fields){
    if(error){
      console.log(error);
    } else {
      res.redirect('/mypage');
    }
  });
});

// mypage change password
app.get('/mypage/editpw', function(req, res){
  res.render('view_editpw');
});

app.post('/mypage/editpw', function(req, res){
  var uid = req.body.uid;
  if(req.body.password1 === req.body.password2){
    var opts = {password:req.body.password1};
    hasher(opts, function(err, pass, salt, hash){
      connection.query('UPDATE USERS SET password=?, salt=? WHERE uid=?', [hash, salt, uid], function(error, result, fields){
        if(error){
          res.status(500);
          console.log(error);
        } else {
          res.redirect('/signin');
        }
          });
            });
  } else {
    res.render('view_alert2', {msg:"비밀번호가 일치하지 않습니다."});
  }
});

//mypage quit
app.get('/mypage/quit', function(req,res){
  if(!req.session.user){
    res.redirect('/signIn');
  } else {}
  var id = req.session.Uid;
  connection.query('DELETE FROM USERS WHERE Uid=?', id, function(error, results, fields){
    if(error){
      console.log('탈퇴 실패');
      res.status(500);
    } else {
      delete req.session.email;
      delete req.session.Uid;
      delete req.session.name;
      delete req.session.phone;
      delete req.session.user;
      res.render('view_alert2', {msg:"탈퇴가 완료되었습니다."});
    }
  });
});

//admin
app.get('/admin',function(req,res){
    var privilege = req.session.privilege;
    var sql= 'SELECT * FROM USERS;';
    var sql2 = 'SELECT * FROM SCHEDULE';
    var sql3 = 'SELECT Lid, usable, extension, name FROM LOCKER, USERS WHERE LOCKER.owner = USERS.uid ORDER BY lid';
    if(!req.session.user){
      res.redirect('/signIn');
    }else {
        if(privilege!=1){
            res.redirect('/main');
        }else {
            connection.query(sql, function(err, rows, fields){
                if(err){
                    res.send('Internal Server Error');
                    console.log(err);
                } else {
                    connection.query(sql2, function(err, rows2, fields){
                        if(err){
                            res.send("Internal Server Error");
                            console.log(err);
                        }
                        else {
                          connection.query(sql3, function(err, rows3, fields){
                            if(err){
                              console.log(err);
                            } else {
                              res.render('view_admin',{users:rows, schedule:rows2, privilege:req.session.privilege, locker:rows3});
                            }
                          })

                        }
                    });
                }
            });
        };
    };
});

app.get(['/admin/changePrivilege','/admin/changePrivilege?id=:id'],function(req,res){
    var id = req.query.id;
    var privilege = req.session.privilege;
    var sql = 'UPDATE USERS SET privilege=2 WHERE Uid=?;';
    if(privilege!=1){
        res.render('view_alert', {msg:"허가되지 않은 접근입니다."});
    }else{
        connection.query(sql, id, function(err, rows, fields){
           if(err){
               console.log(err);
           } else{
               res.redirect('/admin');
           }
        });
    };
});

//관리자페이지 내 회원삭제
app.get(['/admin/deleteUser','/admin/deleteUser?id=:id'],function(req,res){
    var id = req.query.id;
    var privilege = req.session.privilege;
    var sql = 'DELETE FROM USERS WHERE Uid=?;';
    if(privilege!=1){
        res.render('view_alert', {msg:"허가되지 않은 접근입니다."});
    }else{
        connection.query(sql, id, function(err, rows, fields){
           if(err){
               console.log(err);
           } else{
               res.redirect('/admin');
           }
        });
    };
});

app.get('/admin/changePrivilegeAll', function(req, res){
  var privilege = req.session.privilege;
  var sql = 'UPDATE USERS SET privilege=2 WHERE privilege=3;'
  if(privilege!=1){
    res.render('view_alert', {msg:"허가되지 않은 접근입니다."});
  } else {
    connection.query(sql, function(err, rows, fields){
      if(err){
        console.log(error);
      } else {
        res.redirect('/admin');
      }
    });
  }
});

//admin return locker
app.get(['/admin/locker','/admin/locker?id=:id'], function(req, res){
  var id = req.query.id;
  var sql = 'UPDATE LOCKER SET usable=1, owner=NULL WHERE Lid=?';
  connection.query(sql, id, function(error, result, fields){
    if(error){
      console.log(error);
    } else {
      res.redirect('/admin');
    }
  });
});

app.get('/admin/changeExtensionAll', function(req,res){
  var sql = 'UPDATE LOCKER SET extension=0';
  connection.query(sql, function(error, result, fields){
    if(error){
      console.log(error);
    } else {
      res.redirect('/admin');
    }
  });
});

//admin schedule
app.post('/admin/setSchedule',function(req,res){
    var type = req.body.dateType;
    var str_date = req.body.str_date;
    var end_date = req.body.end_date;
    var sql = 'UPDATE SCHEDULE SET strDate = ?, endDate = ? WHERE type = ?;';
    connection.query(sql, [str_date, end_date, type], function(err, rows, fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       } else{
           res.redirect('/admin');
       }
    });
});

//register user
app.get('/register', function(req, res){
  res.render('view_register');
});

app.post('/register', function(req, res){
  var sid = req.body.sid;
  var name = req.body.name;
  var lid = req.body.lid;

  //회원가입
  var opts = {password:req.body.sid};
  hasher(opts, function(err, pass, salt, hash){
    var hashUser = [hash, name, sid, salt];
    connection.query('INSERT INTO USERS(password, name, Uid, salt, privilege) VALUES(?,?,?,?,2)', hashUser, function(error, results, fields){
      if(error){
        console.log(error);
      } else {
        console.log('회원가입 완료');
        //사물함 등록
        connection.query('UPDATE LOCKER SET usable=0, owner=? WHERE Lid=?', [sid, lid], function(error, results, fields){
          if(error){
            console.log(error);
          } else {
            console.log('사물함 완료');
            res.redirect('/register');
          }
        });

      }
    });
  });
});

//connect port
app.listen(3000,function(){
    console.log('Connected, 3000 port!');
});
