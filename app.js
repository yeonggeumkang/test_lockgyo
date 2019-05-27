var express =require('express');
var app = express();
var session = require('express-session');
app.use(session({
    secret : '1107',
    resave : false,
    saveUninitialized : false
}));
var bodyParser = require('body-parser');
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '961107',
  database : 'test_db'
});
connection.connect(); //mysql DB 연결
app.use(bodyParser.urlencoded({exteded:false}));
app.locals.pretty = true;
app.set('views','./views_app'); //view파일 디렉토리 설정
app.set('view engine','jade'); //Jade엔진


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
                if(results[0].password == password) { //비밀번호 일치, 로그인 성공
                    req.session.user = results;
                    res.redirect('/');
                } else { //비밀번호 불일치
                    res.send('wrong password');
                }
            } else { //데이터 없음
                res.send('email do not exist');
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
    connection.query('SELECT email FROM users WHERE student_id = ?', hid,
                    function(error,results,fields){
        if(error) {
            res.send('error');
        } else {
            if(results.length>0){
                res.send(results); //수정해야함
            } else {
                res.send('가입 안됨');
            }
        }
    });
});

//비밀번호 찾기
app.get('/help/pw', function(req,res){
    res.render('view_helpuserpw');
});

app.post('/help/pw', function(req,res){
    var helpVar = [req.body.student_id, req.body.email];

    connection.query('SELECT password FROM users WHERE (student_id=? and email=?)', helpVar,
                    function(error,results,fields){
        if(error) {
            res.send('error');
        } else {
            if(results.length>0){
                res.send(results); //수정해야함
            } else {
                res.send('이메일을 확인하세요');
            }
        }
    });
});

//회원가입 페이지
app.get('/signUp',function(req,res){
    res.render('view_signUp');
});

app.post('/signUp', function(req,res){
    var tid = req.body.student_id;
    connection.query('SELECT * FROM users WHERE student_id = ?', tid,
                    function(error,results,fields){
        if(error){ //쿼리 오류
                res.send('error');

                } else {
                    if(results.length===0){ //데이터 없음, 회원가입

                        if(req.body.password === req.body.password2){ //비밀번호 일치 확인
                            var user = [req.body.email, req.body.password, req.body.name, req.body.student_id, req.body.phone_number]
                            connection.query('INSERT INTO users(email, password, name, student_id, phone_number) values(?,?,?,?,?)', user,                                           function(error, result){
                                if(error){
                                    res.send('error');
                                } else {
                                    res.redirect('/main'); // '/main/:id'로 해야할까
                                }})
                        } else { //password 확인 불일치
                            res.send('비밀번호가 일치하지 않습니다.');
                        }
                    } else { //학번 데이터 있음, 이미 가입
                        res.send('이미 가입된 학생');
                    }
        }
    });
});

app.get('/main', function(req,res) { //메인페이지
    res.render('view_main');
});

app.post('/main', function(req,res){
    var lockNum = req.body.lockerNumber;
    var sql1 = 'SELECT usable FROM LOCKER WHERE LID=?'
    var sql2 = 'update locker set owner_id=?, usable=0 where lid=?;'
    console.log(req.session.studentID);

    connection.query(sql1, lockNum, function(error, results, fields){
      if(error){
        res.send('first query error');
      } else {
        var objectResult = JSON.stringify(results[0]);
        if(objectResult[10]==='0'){ //results의 값을 확인 해야혀~!
          res.send('사용중인 사물함');
        } else {}
     connection.query(sql2, [req.session.studentID, req.body.lockerNumber], function(error, results, fields){
        if(error){
            res.send('second query error');
          } else {
            res.send('신청 완료');
          }
        });


      }
    });
});

app.get(['/notice','/notice?id=:id'],function(req,res){ //공지사항
    var sql_all = 'SELECT * FROM NOTICE;'
    conn.query(sql_all, function(err, rows, fields){
        var id = req.query.id;
        if(id){
            var sql_detail = 'SELECT * FROM NOTICE WHERE ID=?;';
            conn.query(sql_detail,[id],function(err, row, fields){
                if(err){
                    console.log(err);
                    res.status(500).send('Internal Server Error');
                }else {
                    res.render('view_post',{post:row[0]});
                }
            });
        }else{
            res.render('view_notice',{topics:rows});
        };
    });
});
app.get('/notice/add',function(req,res){
   res.render('view_addPost');
});//글쓰기 화면
app.post('/notice/add',function(req,res){//DB에 글 작성
    var title = req.body.title;
    var description = req.body.description;
    var author = req.body.author;
    var sql = 'INSERT INTO notice (title, description, author) VALUES(?, ?, ?);';
    conn.query(sql, [title, description, author], function(err, rows, fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       } else{
           res.redirect('/notice')
       }
    });
});
app.get(['/notice/edit','/notice/edit?id=:id'],function(req,res){
    var id = req.query.id;
    var sql = 'SELECT * FROM NOTICE WHERE ID=?;';
        conn.query(sql,[id],function(err, row, fields){
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
    var sql = 'UPDATE notice SET title=?, description=?, author=? WHERE id=?';
    conn.query(sql,[title, description, author, id], function(err,rows,fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       }else{
           res.redirect('/notice/?id='+id);
       }
    });
});
app.get(['/notice/delete','/notice/delete?id=:id'],function(req,res){
    var id = req.query.id;
    var sql = 'DELETE FROM notice WHERE id=?;';
    conn.query(sql,[id],function(err, row, fields){
       if(err){
           console.log(err);
           res.status(500).send('Internal Server Error');
       }else{
           res.redirect('/notice');
       }
    });
});
app.get('/mypage',function(req,res){ //마이페이지
    res.send("mypage");
    //코드작성//
});

app.get('/admin',function(req,res){ //관리자페이지
    res.render("view_admin");
    //코드작성//
});
app.listen(3000,function(){ //포트접속
    console.log('Connected, 3000 port!');
});
