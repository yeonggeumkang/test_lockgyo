var express =require('express');
var app = express();
var session = require('express-session');
require('date-utils');
var MySQLStore = require('express-mysql-session');
var bkfd2Password = require('pbkdf2-password');
var hasher = bkfd2Password();
app.use(session({
    secret : '1107',
    resave : false,
    saveUninitialized : false,
    store : new MySQLStore({
  host : 'localhost',
  port : 3306,
  user : 'root',
  password : '',
  database : 'test'
  })
}));
var bodyParser = require('body-parser');
var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'test',
    dateStrings: 'date'
});
connection.connect(); //mysql DB 연결
app.use(bodyParser.urlencoded({exteded:false}));
app.locals.pretty = true;
app.set('views','./views_app'); //view파일 디렉토리 설정
app.set('view engine','jade'); //Jade엔진
app.use(express.static('views_app'));
app.use(express.static('views_app'));
app.get('/',function(req,res){ // 사용자 정보 있으면 메인페이지, 없으면 로그인페이지로 리다이렉션 설정.
  if(req.session.user){
    res.redirect('/main');
  } else {
    res.redirect('/signIn');
  }
});

//로그인페이지
app.get('/signIn',function(req,res){
    res.render('view_signIn');
});

app.post('/signIn', function(req,res){
    var email = req.body.email;
    var password = req.body.password;

    connection.query('SELECT * FROM users WHERE email = ?', email,
                    function(error,results,fields){
        if(error) { //query  error
            res.send('error');
        } else {
            if(results.length > 0){ //데이터 존재
                hasher({password:req.body.password, salt:results[0].salt}, function(err, pass, salt, hash){
                  if(results[0].password === hash) { //비밀번호 일치?
                    req.session.email = req.body.email;
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
                /*if(results[0].password == password) { //비밀번호 일치, 로그인 성공

                } else { //비밀번호 불일치
                    res.send('wrong password');
                }*/
            } else { //데이터 없음
                res.render('view_alert2', {msg:"존재하지 않는 아이디입니다.", alertType:1});
            }
        }
    });
});

//아이디(이메일) 찾기
app.get('/help/id', function(req,res){
    res.render('view_helpUser');
});

app.post('/help/id', function(req,res){
    var hid = req.body.student_id;
    connection.query('SELECT email FROM users WHERE Uid = ?', hid,
                    function(error,results,fields){
        if(error) {
            res.send('error');
        } else {
            if(results.length>0){
                res.render('view_alert2', {msg:results[0].email, alertType:1});
            } else {
                res.render('view_alert2', {msg:"존재하지 않는 학번입니다.", alertType:1});
            }
        }
    });
});

//비밀번호 찾기
app.get('/help/pw', function(req,res){
    res.render('view_helpuserpw');
});

app.post('/help/pw', function(req,res){
    var helpVar = [req.body.Uid, req.body.email];

    connection.query('SELECT password FROM users WHERE (Uid=? and email=?)', helpVar,
                    function(error,results,fields){
        if(error) {
            res.send('error');
        } else {
            if(results.length>0){
              res.redirect('/mypage/editpw');
            } else {
                res.render('view_alert2', {msg:"ID(이메일)을 확인하세요.", alertType:1});
            }
        }
    });
});

//로그아웃 페이지
app.get('/logout', function(req,res){
  delete req.session.email;
  delete req.session.Uid;
  delete req.session.name;
  delete req.session.phone;
  delete req.session.user;
  res.redirect('/');
})

//회원가입 페이지
app.get('/signUp',function(req,res){
    res.render('view_signUp');
});


app.post('/signUp', function(req,res){
    var tid = req.body.student_id;
    var temail = req.body.email;

    if(req.body.password === req.body.password2) { //비밀번호 불일치
      connection.query('SELECT * FROM users WHERE email = ?', temail, function(error, results, fields){
          if(error) { res.send('error'); }
          else {
            if(results.length===0){ //데이터 없음 -->회원가입
              connection.query('SELECT * FROM users WHERE Uid=?', tid, function(error, results, fields){
                if(error) {res.send('error2');}
                else {
                  if(results.length===0) {
                    var opts = {password:req.body.password};
                    hasher(opts, function(err, pass, salt, hash){
                      var hashUser = [req.body.email, hash, req.body.name, req.body.student_id, req.body.phone_number, salt];
                      console.log(hashUser);
                      connection.query('INSERT INTO users(email, password, name, Uid, phone, salt) values(?,?,?,?,?,?)', hashUser,
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

// 메인 페이지
app.get('/main', function(req,res) {
    if(!req.session.user){
      res.redirect('/signIn');
    } else {}
    var studentID = req.session.Uid;
    var sql = 'SELECT Lid FROM LOCKER WHERE owner = ?';
    var sql2 = 'SELECT * FROM NOTICE WHERE Nid=1';
    var sql3 = 'SELECT * FROM LOCKER;';
    var sql4 = 'SELECT * FROM SCHEDULE'

    connection.query(sql, studentID, function(error, result1, fields){
      if(error) {
        res.send('query error');
      } else {
        connection.query(sql2, function(error, result2, fields){
          if(error){
            res.send('second query error');
          } else {
            connection.query(sql3, function(error,result3, fields){
              if(error){
                res.send('third query error');
              } else {
                  connection.query(sql4, function(error,result4, fields){
                      if(error){
                          res.send('fourth query error');
                          console.log(error);
                      }else{
                      res.render('view_main', {locker:result1[0], notice:result2[0], allLocker:result3,
                        privilege:req.session.privilege, schedule:result4});
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
    var sql1 = 'SELECT usable FROM LOCKER WHERE LID=?'
    var sql2 = 'update locker set owner=?, usable=0 where lid=?;'
    console.log(req.session.Uid);



    connection.query(sql1, lockNum, function(error, results, fields){
      if(error){
        res.send('first query error');
      } else {
        var objectResult = JSON.stringify(results[0]);
        if(objectResult[10]==='0'){ //results의 값을 확인 해야혀~!
          res.send('사용중인 사물함');
        } else {}
     connection.query(sql2, [req.session.Uid, req.body.lockerNumber], function(error, results, fields){
        if(error){
            res.send('second query error');
          } else {
            res.send('신청 완료');
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
  var sql = 'update locker set usable=1, owner=NULL where owner=?;';
  console.log('step1');
  connection.query(sql, user, function(error, results, fields){
    if(error){
      res.send('query error');
    } else {
      console.log('step2');
      //반납되었다는 알람, 팝업추가
      res.redirect('/main');
    }
  });
});

//사물함 신청
app.get(['/main/enroll','/main/enroll?id:id'], function(req, res){
  console.log('enroll get access');
  var id = req.query.id;
  console.log(id);
  var sql1 = 'SELECT usable FROM LOCKER WHERE LID=?'
  var sql2 = 'update locker set owner=?, usable=0 where lid=?;'
  console.log(req.session.Uid);

  var nowDate = new Date();
  console.log(nowDate);
  var sql3 = 'SELECT strDate, endDate from schedule where Sid=1;'

  connection.query(sql3, function(error, results, fields){
    if(error) {
      console.log('sql3 query error');
    } else {
        var strDate = new Date(results[0].strDate);
        var endDate = new Date(results[0].endDate);
        console.log(nowDate, strDate, endDate);
        if(strDate < nowDate && nowDate < endDate) {
          connection.query(sql1, id, function(error, results, fields){
            if(error){
              res.send('first query error');
            } else {
              var objectResult = JSON.stringify(results[0]);
              if(objectResult[10]==='0'){ //results의 값을 확인 해야혀~!
                res.send('사용중인 사물함');
              } else {}
           connection.query(sql2, [req.session.Uid, id], function(error, results, fields){
              if(error){
                  res.send('second query error');
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
  console.log(id);
  var lockNum = req.body.lockerNumber;
});

//공지사항, notice
app.get(['/notice','/notice?id=:id'],function(req,res){
  if(!req.session.user){
    res.redirect('/signIn');
  } else {
      var sql_all = 'SELECT * FROM NOTICE;'
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
                      var sql_comment = 'SELECT * FROM COMMENT WHERE notice=?;';
                      connection.query(sql_comment, [id], function(err, row2, fields){
                        if(err){
                          console.log('Comment DB error');
                        }else {
                          console.log(row2);
                          res.render('view_post', {post:row[0], privilege:req.session.privilege, authorName:authorName,
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
  console.log('comment post conneted');
  var nid = req.query.id;
  var c_content = req.body.c_content;
  var c_author = req.session.name;
  var sql = 'INSERT INTO comment values(?,?,?);';
  connection.query(sql, [nid, c_content, c_author], function(err, row, fields){
    if(err){
      console.log('query error');
    }else {
      console.log('update completed');
      res.redirect('/notice?id='+nid);
    }
  });
});
//공지사항 추가
app.get('/notice/add',function(req,res){
   res.render('view_addPost');
});

app.post('/notice/add',function(req,res){ //DB에 글 작성
    var title = req.body.title;
    var description = req.body.description;
    var author = req.session.name;
    var timestamp = req.body.timestamp;
    var sql = 'INSERT INTO notice (title, description, author, timestamp) VALUES(?, ?, ?, ?);';
    connection.query(sql, [title, description, author, timestamp], function(err, rows, fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       } else{
           res.redirect('/notice')
       }
    });
});

//공지사항 수정
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
    var author = req.body.author;
    var sql = 'UPDATE notice SET title=?, description=?, author=? WHERE Nid=?';
    connection.query(sql,[title, description, author, id], function(err,rows,fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       }else{
           res.redirect('/notice/?id='+id);
       }
    });
});

//공지사항 삭제
app.get(['/notice/delete','/notice/delete?id=:id'],function(req,res){
    var id = req.query.id;
    var sql = 'DELETE FROM notice WHERE Nid=?;';
    connection.query(sql,[id],function(err, row, fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       }else{
           res.redirect('/notice');
       }
    });
});

// 마이페이지
app.get('/mypage', function(req, res){
    if(!req.session.user){
      console.log('no user');
      res.redirect('/signIn');
    } else {
    var user = req.session.Uid;
    res.render('view_mypage',{name:req.session.name, email:req.session.email,
                              phone_number:req.session.phone, studentID:user, privilege:req.session.privilege});}
});
app.post('/mypage/edit', function(req, res){
  res.send('hello');
});
//개인정보 수정
app.get('/mypage/edit', function(req, res){
  if(!req.session.user){
    res.redirect('/signIn');
  } else {}
  var user = req.session.Uid;
  res.render('view_myedit',{name:req.session.name, email:req.session.email,
                            phone_number:req.session.phone, studentID:user});
});
// 비밀번호 변경
app.get('/mypage/editpw', function(req, res){
  res.render('view_editpw');
});

app.post('/mypage/editpw', function(req, res){
  if(req.body.password === req.body.password2){
    var opts = {password:req.body.password};
    hasher(opts, function(err, pass, salt, hash){
      connection.query('UPDATE users SET password=?, salt=?', [hash, salt], function(error, result, fields){
        if(error){
          res.status(500);
          console.log('query error');
        } else {
          res.redirect('/signin');
        }
    });
    });
  } else {
    res.render('view_alert2', {msg:"비밀번호가 일치하지 않습니다."});
  }
});

// 회원탈퇴
app.get('/mypage/quit', function(req,res){
  if(!req.session.user){
    res.redirect('/signIn');
  } else {}
  var id = req.session.Uid;
  connection.query('delete from users where Uid=?', id, function(error, results, fields){
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

//관리자 페이지
app.get('/admin',function(req,res){
    var privilege = req.session.privilege;
    console.log(privilege);
    var sql= 'SELECT * FROM USERS WHERE privilege=3;';
    if(!req.session.user){
      res.redirect('/signIn');
    }else {
        if(privilege!=1){
            res.redirect('/main');
        }else {
            connection.query(sql, function(err, rows, fields){
                if(err){
                    res.send('error');
                    console.log(err);
                }
                else {
                     res.render('view_admin',{users:rows, privilege:req.session.privilege});
                }
            });
        };
    };
});
//관리자페이지 내 회원권한 변경
app.get(['/admin/changePrivilege','/admin/changePrivilege?id=:id'],function(req,res){
    var id = req.query.id;
    var privilege = req.session.privilege;
    var sql = 'UPDATE USERS SET privilege=2 where Uid=?;';
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
//전체회원 승인
app.get('/admin/changePrivilegeAll', function(req, res){
  var privilege = req.session.privilege;
  var sql = 'UPDATE USERS SET privilege=2 where privilege=3;'
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
           res.redirect('/admin')
       }
    });
});

app.listen(3000,function(){ //포트접속
    console.log('Connected, 3000 port!');
});
