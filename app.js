var express =require('express');
var app = express();
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
    res.send("redirection page");
    //코드작성//
});


app.get('/signIn',function(req,res){ //로그인페이지
    res.render('view_signIn');
});

app.post('/signIn', function(req,res){
    var email = req.body.email;
    var password = req.body.password;
    
    connection.query('SELECT * FROM users WHERE email = ?', email,
                    function(error,results,fields){
        if(error) {
            res.send('error');
        } else {
            if(results.length > 0){
                if(results[0].password == password) {
                    res.send('login completed');
                } else {
                    res.send('wrong password');
                }
            } else {
                res.send('email do not exist');
            }
        }
    });
});

app.get('/helpUser/id', function(req,res){
    res.render('view_helpUser');
});

app.post('/helpUser/id', function(req,res){
    var hid = req.body.student_id;
    connection.query('SELECT email FROM users WHERE student_id = ?', hid,
                    function(error,results,fields){
        if(error) {
            res.send('error');
        } else {
            if(results.length>0){
                res.send(results[0]); //수정해야함
            } else {
                res.send('가입 안됨');
            }
        }
    });
});

app.get('/helpUser/pw', function(req,res){
    res.render('view_helpuserpw');
});

app.post('/helpUser/pw', function(req,res){
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

app.get('/signUp',function(req,res){ //회원가입페이지
    res.render('view_signUp');
    //코드작성//
});

app.post('/signUp', function(req,res){
    var tid = req.body.student_id;
    connection.query('SELECT * FROM users WHERE student_id = ?', tid,
                    function(error,results,fields){
        if(error){
                res.send('error');
                
                } else {
                    if(results.length===0){
                        //가입
                        if(req.body.password === req.body.password2){
                            var user = [req.body.email, req.body.password, req.body.name, req.body.student_id, req.body.phone_number]
                            connection.query('INSERT INTO users(email, password, name, student_id, phone_number) values(?,?,?,?,?)', user,                                           function(error, result){
                                if(error){
                                    res.send('error');
                                } else {
                                    res.redirect('/main'); // '/main/:id'로 해야할까
                                }
                                                                    })
                        } else {
                            //password 오류
                            res.send('비밀번호를 확인하세요.');
                        }
                    } else {
                        //이미 가입
                        res.send('이미 가입된 학생');
                    }
        }
    });

});

app.get('/main',function(req,res){ //메인페이지 
    res.send("main page");
    //코드작성//
});
app.get(['/notice','/notice/:id'],function(req,res){ //공지사항
    res.send("notice list page");
    //코드작성//
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