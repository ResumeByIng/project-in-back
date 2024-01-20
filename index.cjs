const express = require('express');
const { createConnection } = require('mysql');
const cors = require('cors');
const speakeasy = require('speakeasy');
const moment = require('moment-timezone');
const axios = require('axios');
const { config } = require('dotenv');;
config({ path: `${__dirname}/.env` });
const app = express();
// const postmark = require('postmark');
// const client = new postmark.ServerClient(process.env.TOKEN_EMAIL);
app.use(express.json()); 
app.use(cors());

const db = createConnection({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
});


app.get('/api/data', (req, res) => {
  const sql = 'SELECT * FROM username';
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      res.status(500).json({ error: 'Error querying MySQL' });
      return;
    }
    res.json(result);
  });
});
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL Database!');
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  
  db.query(
    "SELECT u.id AS user_id, u.email, u.password, u.role, " +
    "p.user_id AS professor_user_id, p.first_name AS professor_first_name, p.last_name AS professor_last_name, " +
    "p.faculty AS professor_faculty, p.branch AS professor_branch, p.position AS professor_position, " +
    "p.qualification AS professor_qualification, p.gender AS professor_gender, " +
    "s.user_id AS student_user_id, s.first_name AS student_first_name, s.last_name AS student_last_name, " +
    "s.id_student AS student_id_student, s.faculty AS student_faculty, s.branch AS student_branch, " +
    "s.class_year AS student_class_year, s.gender AS student_gender " +
    "FROM username u " +
    "LEFT JOIN data_professor p ON u.id = p.user_id " +
    "LEFT JOIN data_student s ON u.id = s.user_id " +
    "WHERE u.email = ? AND u.password = ?",
    [email, password],
    (err, result) => {
      if (err) {
        return res.status(500).send({ err: err.message });
      }

      if (result.length > 0) {
        return res.status(200).send(result);
      } else {
        return res.status(401).send({ message: "id/pass ไม่ถูกต้อง" });
      }
    }
  );
});


app.get('/api/getpass', (req, res) => {
  const idTQF = req.query.idTQF; // รับชื่อเทมเพลตจากคำขอ
  const query = `SELECT template_file FROM template WHERE id_TQF = ?`;
  db.query(query, [idTQF], (error, results) => {
    if (error) {
      console.error('Error fetching template from database:', error);
      res.status(500).json({ message: 'Error fetching template from database' });
    } else {

      const templateFile = results[0].template_file;
      res.setHeader('Content-Disposition', `attachment; filename="template.docx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.send(templateFile);
    }
  });
});
app.get('/api/gettqf7', (req, res) => {
  const id = req.query.id;

  // ใช้คำสั่ง SQL เพื่อดึงข้อมูลจากฐานข้อมูล
  const query = 'SELECT id, name_file_tqf FROM file_tqf7 WHERE id = ?';
  
  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('Error fetching template from database:', error);
      res.status(500).json({ message: 'Error fetching template from database' });
    } else {
      if (results.length > 0) {
        const templateFile = results[0].name_file_tqf;
        res.setHeader('Content-Disposition', `attachment; filename="template.docx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(templateFile);
      } else {
        res.status(404).json({ message: 'Template not found' });
      }
    }
  });
});

app.post('/api/updateStatusTQF', (req, res) => {
  const courseCode = req.body.courseCode; // รับ courseCode จากคำขอ POST
  const query = `UPDATE tqf SET status_tqf = NOW() WHERE course_code = ?`;

  // Query อัพเดตค่า status_tqf
  db.query(query, [courseCode], (error, results) => {
    if (error) {
      console.error('Error updating status_tqf:', error);
      res.status(500).json({ message: 'Error updating status_tqf' });
    } else {
      console.log('status_tqf updated successfully');
      res.status(200).json({ message: 'status_tqf updated successfully' });
    }
  });
});


app.post('/api/update-data', (req, res) => {
  const { id_TQF } = req.body;

  const query = 'UPDATE tqf SET status_tqf = NOW() WHERE id_TQF = ?';

  db.query(query, [id_TQF], (error, results) => {
    if (error) {
      console.error('Error updating data:', error);
      res.status(500).send('Error updating data');
    } else {
      console.log('Data updated successfully');
      res.status(200).send('Data updated successfully');
    }
  });
});
app.post('/api/reset-date', (req, res) => {

  const query = 'UPDATE tqf SET status_tqf = NULL';

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error updating data:', error);
      res.status(500).send('Error updating data');
    } else {
      console.log('Data updated successfully');
      res.status(200).send('Data updated successfully');
    }
  });
});

app.post('/api/create-news', (req, res) => {
  const { title, content, date_created, author } = req.body;

  const query = `
    INSERT INTO data_news (title, content, date_created, author)
    VALUES (?, ?, ?, ?)
  `;

  // Query to insert new news
  db.query(query, [title, content, date_created, author], (error, results) => {
    if (error) {
      console.error('Error creating news:', error);
      res.status(500).json({ message: 'Error creating news' });
    } else {
      console.log('News created successfully');
      res.status(200).json({ message: 'News created successfully' });
    }
  });
});

app.get('/api/get-news', (req, res) => {
  const query = 'SELECT * FROM data_news';

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching news:', error);
      res.status(500).json({ message: 'Error fetching news' });
    } else {
      res.status(200).json(results);
    }
  });
});

app.delete('/api/delete-news/:newsId', (req, res) => {
  const newsId = req.params.newsId;

  db.query('DELETE FROM data_news WHERE news_id = ?', newsId, (error, result) => {
    if (error) {
      console.error('Error deleting news:', error);
      res.status(500).send('Internal Server Error');
    } else {
      console.log('News deleted successfully:', result);
      res.status(200).send('News deleted successfully');
    }
  });
});

app.post("/api/register", (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    studentId,
    faculty,
    classYear,
    branch,
    gender
  } = req.body;

  const insertUserQuery = `
    INSERT INTO username (email, password, role)
    VALUES (?, ?, ?)
  `;
  
  db.query(insertUserQuery, [email, password, 1], (error, userResult) => {
    if (error) {
      console.error('Error inserting user:', error);
      return res.status(500).json({ message: 'Error registering user' });
    }

    const userId = userResult.insertId;

    const insertStudentQuery = `
      INSERT INTO data_student (user_id, first_name, last_name, id_student, faculty, branch, class_year, gender)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(
      insertStudentQuery,
      [userId, firstName, lastName, studentId, faculty, branch, classYear, gender],
      (error, studentResult) => {
        if (error) {
          console.error('Error inserting student data:', error);
          return res.status(500).json({ message: 'Error registering user' });
        }

        return res.status(200).json({ message: 'User registered successfully' });
      }
    );
  });
});

app.post('/api/save-extrapoints', (req, res) => {
  const dataToInsert = req.body.map((item) => [
    item.picture,
    localStorage.getItem('first_name'),
    localStorage.getItem('last_name'),
    item.clause,
    item.list,
    item.points,
    localStorage.getItem('user_id'),
  ]);

  const query = `
    INSERT INTO Extrapoints (extrapoint_picture, first_name, last_name, clause, list, points, id_student)
    VALUES ?;
  `;

  db.query(query, [dataToInsert], (error, results) => {
    if (error) {
      console.error('Error saving extrapoints:', error);
      res.status(500).json({ message: 'Error saving extrapoints' });
    } else {
      console.log('Extrapoints saved successfully');
      res.status(200).json({ message: 'Extrapoints saved successfully' });
    }
  });
});

app.get('/api/get-extrapoints', (req, res) => {
  const query = 'SELECT * FROM Extrapoints';

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching extrapoints:', error);
      res.status(500).json({ message: 'Error fetching extrapoints' });
    } else {
      res.status(200).json(results);
    }
  });
});

const userSecrets = [];
app.post('/generate-otp', (req, res) => {
  // สร้าง OTP
  userSecrets[req.body.email] = speakeasy.generateSecret();
  const otp = speakeasy.totp({
    secret: userSecrets[req.body.email].base32,
    step: 60,
  });

  // ข้อความอีเมล
  const mailOptions = {
    from: 's62122519025@ssru.ac.th', // อีเมลของคุณ
    to: req.body.email, // อีเมลผู้รับ
    subject: 'การยืนยันตัวตนในระบบประกันคุณภาพ', // หัวข้ออีเมล
    textBody: `เราขอยืนยันตัวตนของคุณในระบบประกันคุณภาพด้วยรหัส OTP ดังนี้: ${otp}\nกรุณาใส่รหัส OTP นี้ในแอปพลิเคชันของคุณเพื่อยืนยันตัวตน\n\nขอแสดงความนับถือ\nทีมงานระบบประกันคุณภาพ`, // เนื้อหาข้อความ
  };

  // ส่งอีเมล
  client.sendEmail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email: ', error);
      res.status(500).json({ message: 'Error sending OTP email' });
    } else {
      console.log('Email sent: ', info.response);
      res.json({ message: 'OTP sent successfully' });
    }
  });
});

app.post('/verify', (req, res) => {
  const verified = speakeasy.totp.verify({
    secret: userSecrets[req.body.email].base32,
    token: req.body.otp,
    step: 60, // ต้องตรงกับค่า step ที่ใช้ในการสร้าง OTP
  });
  if (verified) {
    // ค่า OTP ถูกต้อง
    res.json({ message: 'OTP ถูกต้อง' });
  } else {
    // ค่า OTP ไม่ถูกต้อง
    res.status(400).json({ message: 'OTP ไม่ถูกต้อง' });
  }
});

app.post('/reset-otp', (req, res) => {
  const secret = speakeasy.generateSecret();
  userSecrets[req.body.email] = secret;

  const otp = speakeasy.totp({
    secret: secret.base32,
    step: 60,
  });

  const mailOptions = {
    from: 's62122519025@ssru.ac.th', // อีเมลของคุณ
    to: req.body.email, // อีเมลผู้รับ
    subject: 'การยืนยันตัวตนในระบบประกันคุณภาพ', // หัวข้ออีเมล
    textBody: `สวัสดีคุณ ${req.body.email},\n\nเราขอยืนยันตัวตนของคุณในระบบประกันคุณภาพด้วยรหัส OTP ดังนี้: ${otp}\nกรุณาใส่รหัส OTP นี้ในแอปพลิเคชันของคุณเพื่อยืนยันตัวตน\n\nขอแสดงความนับถือ,\nทีมงานระบบประกันคุณภาพ`, // เนื้อหาข้อความ
  };

  client.sendEmail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email: ', error);
      res.status(500).json({ message: 'Error sending OTP email' });
    } else {
      console.log('Email sent: ', info.response);
      res.json({ message: 'OTP reset successfully' });
    }
  });
});

app.delete('/delete-secret/:email', (req, res) => {
  const userEmailToRetrieve = req.params.email;

  if (userSecrets[userEmailToRetrieve]) {
    // ลบข้อมูลเครื่องมือ OTP ของผู้ใช้
    delete userSecrets[userEmailToRetrieve];
    res.status(200).json({ message: 'Deleted user OTP secret successfully' });
  } else {
    // ไม่พบข้อมูลเครื่องมือ OTP ของผู้ใช้
    res.status(404).json({ message: 'User OTP secret not found' });
  }
});
app.post('/delete-otp', (req, res) => {
  delete userSecrets[userEmailToRetrieve];
});

app.post('/line', (req, res) => {
  const formattedDate = moment.tz(req.body.dateTQF, 'Asia/Bangkok');
  const currentDate = moment();
  formattedDate.startOf('day'); // เริ่มเวลาที่ 00:00:00
  currentDate.startOf('day');  // เริ่มเวลาที่ 00:00:00
  const deadline = formattedDate.format('YYYY-MM-DD');
  console.log(formattedDate)
  console.log(currentDate)
  const timestamp = formattedDate - currentDate;
  console.log(timestamp)
    if (timestamp < 86400000) {
      res.status(200).json({ success: 'อัพเดตวันที่สำเร็จ' });
      setTimeout(() => {
        const token = process.env.TOKEN;
        const message = `\nไกล้ครบกำหนดวันที่  ${deadline}\nอย่าลืมส่งเอกสารมคอ.นะครับ!`;
        const url = 'https://notify-api.line.me/api/notify';
        const data = {
          message: message
        };
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        axios.post(url, new URLSearchParams(data), { headers })
          .then(response => {
            console.log('ส่งข้อความสำเร็จ!');
          })
          .catch(error => {
            console.error('เกิดข้อผิดพลาดในการส่งข้อความ:', error);
          });
      }, timestamp); 
    }
});

module.exports = app;
