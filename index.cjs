const express = require('express');
const { createConnection } = require('mysql');
const cors = require('cors');
const speakeasy = require('speakeasy');
const path = require('path');
const { config } = require('dotenv');;
const cloudinary = require("./config.js");

config({ path: `${__dirname}/.env` });

const multer = require('multer');

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/')
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + '-' + Date.now() + ".pdf")
//   }
// });

// const upload = multer({ storage: storage });

config({ path: `${__dirname}/.env` });

const app = express();
const postmark = require('postmark');
const client = new postmark.ServerClient(process.env.TOKEN_EMAIL);
app.use(express.json()); 
app.use(cors());

const db = createConnection({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  insecureAuth: true
});

app.listen(8081, () => {
  console.log(`Server is running on port ${8081}`);
});

const storage = multer.diskStorage({

	filename: function (req, file, cb) {
	  cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
	}, 
  });
  
const upload = multer({ storage: storage ,   limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/upload', upload.single('image'), async (req, res) => {
  let data;
	if (!req.file) {
	  return res.status(400).send({ message: 'No file uploaded.', status: 400 });
	}
	const uploadOptions = {
		transformation: [{ width: 800, height: 600, crop: 'limit' }],
	  };
  

	cloudinary.uploader.upload(req.file.path,uploadOptions, (error, result) => {
	  if (error) {
		console.error(error);
		return res.status(500).json({ success: false, message: 'Error uploading image.' });
	  }
    const { first_name, last_name, clause, list, points, id_student, imageFile } = req.body;

    const query = 'INSERT INTO Extrapoints (extrapoint_image, first_name, last_name, clause, list, points, id_student) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
    console.log('imageFile -> ', imageFile); // แสดงข้อมูลของไฟล์ที่อัปโหลด
    console.log('body -> ', req.body); // แสดงข้อมูลอื่นๆ ที่ถูกส่งมากับคำขอ
    db.query(query, [result.secure_url, first_name, last_name, clause, list, points, id_student], (err, result) => {
      if (err) {
        console.error('Error inserting file into database:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      return res.json({ message: 'File uploaded successfully!' });
    });
	})



  
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
    "s.class_year AS student_class_year, s.gender AS student_gender, " +
    "g.user_id AS graduate_user_id, g.first_name AS graduate_first_name, g.last_name AS graduate_last_name, " +
    "g.id_graduate AS graduate_id_graduate, g.faculty AS graduate_faculty, g.branch AS graduate_branch, " +
    "g.class_year AS graduate_class_year, g.gender AS graduate_gender " +
    "FROM username u " +
    "LEFT JOIN data_professor p ON u.id = p.user_id " +
    "LEFT JOIN data_student s ON u.id = s.user_id " +
    "LEFT JOIN data_graduate g ON u.id = g.user_id " +
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
  const { title, content, author } = req.body;

  const query = `
    INSERT INTO data_news (title, content, author)
    VALUES (?, ?, ?)
  `;

  // Query to insert new news
  db.query(query, [title, content, author], (error, results) => {
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

app.post('/api/save-extrapoints', upload.single('extrapoint_picture'), (req, res) => {
  // Access the uploaded file using req.file
  const file = req.file;
  // Process the file as needed

  const {
    first_name,
    last_name,
    clause,
    list,
    points,
    id_student
  } = req.body;

  const query = `
    INSERT INTO Extrapoints (extrapoint_picture, first_name, last_name, clause, list, points, id_student)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [file.filename, first_name, last_name, clause, list, points, id_student], (error, results) => {
    if (error) {
      console.error('Error saving extrapoints:', error);
      res.status(500).json({ message: 'Error saving extrapoints' });
    } else {
      console.log('Extrapoints saved successfully');
      res.status(200).json({ message: 'Extrapoints saved successfully' });
    }
  });
});

app.get('/api/get-all-extrapoints', (req, res) => {
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

// Endpoint เพื่ออัปเดตข้อมูลอาจารย์ในฐานข้อมูล
app.put('/api/update-professor/:user_id', (req, res) => {
  // รับค่า user_id จาก parameter
  const { user_id } = req.params;

  // รับข้อมูลที่จะอัปเดตจาก body ของคำขอ
  const { first_name, last_name, faculty, branch, position, qualification, gender } = req.body;

  // เขียน query SQL เพื่ออัปเดตข้อมูลอาจารย์
  const query = `
    UPDATE data_professor
    SET
      first_name = ?,
      last_name = ?,
      faculty = ?,
      branch = ?,
      position = ?,
      qualification = ?,
      gender = ?
    WHERE user_id = ?
  `;

  // Execute the query
  db.query(query, [first_name, last_name, faculty, branch, position, qualification, gender, user_id], (error, results) => {
    if (error) {
      console.error('Error updating professor data:', error);
      res.status(500).json({ message: 'Error updating professor data' });
    } else {
      console.log('Professor data updated successfully');
      res.status(200).json({ message: 'Professor data updated successfully' });
    }
  });
});
// Endpoint เพื่อดึงข้อมูล Meetings จากฐานข้อมูล
app.get('/api/meetings', (req, res) => {
  // เขียน query SQL เพื่อดึงข้อมูล Meetings จากฐานข้อมูล
  const query = 'SELECT * FROM data_meeting';

  // ทำการ query ฐานข้อมูล
  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching meetings from database:', error);
      res.status(500).json({ message: 'Error fetching meetings from database' });
    } else {
      // ส่งข้อมูล Meetings กลับไปยัง React ในรูปแบบ JSON
      res.json(results);
    }
  });
});

app.post('/api/meetings', (req, res) => {
  try {
    const { title, date, room, position, agenda } = req.body;

    // Validate input
    if (!title || !date || !room || !position || !agenda) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    // Insert ข้อมูลลงในฐานข้อมูล Meetings ด้วย SQL query
    const query = `
      INSERT INTO data_meeting (title, date, room, position, agenda)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(query, [title, date, room, position, agenda], (error, results) => {
      if (error) {
        console.error('Error adding meeting:', error);
        res.status(500).json({ message: 'Error adding meeting' });
      } else {
        res.status(201).json({
          message: 'Meeting added successfully',
          meeting: { meeting_id: results.insertId, title, date, room, position, agenda },
        });
      }
    });
  } catch (error) {
    console.error('Error adding meeting:', error);
    res.status(500).json({ message: 'Error adding meeting' });
  }
});

// สร้างเส้นทางสำหรับดึงข้อมูลจากฐานข้อมูลด้วย user_id
app.get('/api/data/user/:id', (req, res) => {
  const userId = req.params.id; // ดึงค่า user_id จาก params
  const sql = 'SELECT * FROM data_professor WHERE user_id = ?';
  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      res.status(500).json({ error: 'Error querying MySQL' });
      return;
    }
    res.json(result);
  });
});

app.post("/api/registerbyadminna", (req, res) => {
  const {
    email,
    password
  } = req.body;

  const insertUserQuery = `
    INSERT INTO username (email, password, role)
    VALUES (?, ?, ?)
  `;
  
  db.query(insertUserQuery, [email, password, 2], (error, userResult) => {
    if (error) {
      console.error('Error inserting user:', error);
      return res.status(500).json({ message: 'Error registering user' });
    }

    const userId = userResult.insertId;

      const insertProfessorQuery = `
      INSERT INTO data_professor (user_id, first_name, last_name, faculty, branch, position, qualification, gender)
      VALUES (?, '', '', '', '', '', '', '')
    `;
    
    db.query(
      insertProfessorQuery,
      [userId, null, null, null, null, null, null],
      (error, professorResult) => {
        if (error) {
          console.error('Error inserting professor data:', error);
          return res.status(500).json({ message: 'Error registering professor' });
        }
        return res.status(200).json({ message: 'Professor registered successfully' });
      }
    );
  });
});

////////// ระบบ OTP #####////////////////////////////////

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
    from: 's62122519010@ssru.ac.th', // อีเมลของคุณ
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
    from: 's62122519010@ssru.ac.th', // อีเมลของคุณ
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

// Endpoint สำหรับรับข้อมูลการร้องเรียนและบันทึกลงฐานข้อมูล
app.post('/api/complaints', (req, res) => {
  const { complaintType, complaintText } = req.body;

  // เชื่อมต่อกับฐานข้อมูลและบันทึกข้อมูลการร้องเรียน
  const query = 'INSERT INTO complaints (complaintType, complaintText) VALUES (?, ?)';
  db.query(query, [complaintType, complaintText], (error, result) => {
    if (error) {
      console.error('Error inserting complaint into database:', error);
      res.status(500).json({ message: 'Error inserting complaint into database' });
    } else {
      console.log('Complaint inserted successfully');
      res.status(201).json({ message: 'Complaint submitted successfully' });
    }
  });
});

// Endpoint to fetch complaints
app.get('/complaints', (req, res) => {
  const sql = 'SELECT * FROM complaints';
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error fetching complaints:', err);
      res.status(500).json({ error: 'Error fetching complaints' });
    } else {
      res.json(result);
    }
  });
});

app.delete('/api/delete/complaints', (req, res) => {
  // สร้างวัตถุ Date เพื่อระบุวันที่ปัจจุบัน
  const today = new Date();

  // ให้วันที่ใหม่เป็นวันที่ก่อนหนึ่งวัน
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 7);

  // แปลงวันที่ใหม่เป็นรูปแบบ ISO String เพื่อใช้ในคำสั่ง SQL
  const formattedDate = yesterday.toISOString();

  // สร้างคำสั่ง SQL ที่ใช้ในการลบข้อมูลที่ถูกสร้างก่อนวันที่เท่ากับ yesterday
  const deleteQuery = `DELETE FROM complaints WHERE createdAt < '${formattedDate}'`;
  
  // ทำการ query ข้อมูลในฐานข้อมูล
  db.query(deleteQuery, (err, result) => {
    if (err) {
      console.error('Error deleting old data:', err);
      return;
    }
    console.log('Old data deleted successfully');
  });
});

app.post('/api/confirm-graduate/:user_id', (req, res) => {
  const userId = req.params.user_id;

  // ดึงข้อมูลนักศึกษาจาก data_student
  const selectQuery = 'SELECT * FROM data_student WHERE user_id = ?';
  db.query(selectQuery, [userId], (error, results) => {
    if (error) {
      console.error('Error selecting student data:', error);
      res.status(500).json({ message: 'Error selecting student data' });
      return;
    }

    // ตรวจสอบว่ามีข้อมูลนักศึกษาหรือไม่
    if (results.length === 0) {
      res.status(404).json({ message: 'Student data not found' });
      return;
    }

    const studentData = results[0];

    // ย้ายข้อมูลนักศึกษาไปยัง data_graduate
    const insertQuery = `
      INSERT INTO data_graduate (user_id, first_name, last_name, id_graduate, faculty, branch, class_year, gender, work_place, salary, work_about)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
    `;
    db.query(
      insertQuery,
      [studentData.user_id, studentData.first_name, studentData.last_name, studentData.id_student, studentData.faculty, studentData.branch, studentData.class_year, studentData.gender],
      (insertError, insertResults) => {
        if (insertError) {
          console.error('Error inserting data into data_graduate:', insertError);
          res.status(500).json({ message: 'Error inserting data into data_graduate' });
          return;
        }

        // ลบข้อมูลนักศึกษาที่ถูกย้ายไปยัง data_graduate ออกจาก data_student
        const deleteQuery = 'DELETE FROM data_student WHERE user_id = ?';
        db.query(deleteQuery, [userId], (deleteError, deleteResults) => {
          if (deleteError) {
            console.error('Error deleting student data:', deleteError);
            res.status(500).json({ message: 'Error deleting student data' });
            return;
          }

          // Update role เป็น 3 ในตาราง username
          const updateRoleQuery = 'UPDATE username SET role = 3 WHERE id = ?';
          db.query(updateRoleQuery, [userId], (updateError, updateResults) => {
            if (updateError) {
              console.error('Error updating role:', updateError);
              res.status(500).json({ message: 'Error updating role' });
              return;
            }

            // ส่งข้อความยืนยันกลับไปยัง frontend
            res.status(200).json({ message: 'Student data confirmed and moved to data_graduate successfully' });
          });
        });
      }
    );
  });
});

// Endpoint สำหรับดึงข้อมูล salary, work_place, และ work_about ของนิสิตที่ระบุด้วย user_id
app.get('/data_graduate/all', (req, res) => {
  const userId = req.query.user_id;

  // ตรวจสอบว่า user_id ถูกส่งมาหรือไม่
  if (!userId) {
    return res.status(400).json({ message: 'Missing user_id parameter' });
  }

  // สร้าง query เพื่อดึงข้อมูล salary, work_place, และ work_about ของนิสิตที่มี user_id ตามที่ระบุ
  const query = `
    SELECT salary, work_place, work_about, end_year
    FROM data_graduate 
    WHERE user_id = ?
  `;
  
  db.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error('Error fetching data graduate:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }

    // ตรวจสอบว่ามีข้อมูลของ user_id ที่ระบุหรือไม่
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ส่งข้อมูลกลับเป็น JSON response
    res.json(results[0]); // เนื่องจากเราต้องการเฉพาะข้อมูลของ user_id เดียว
  });
});

app.get('/api/all-user-data', (req, res) => {
  const sqlStudent = 'SELECT * FROM data_student';
  const sqlGraduate = 'SELECT * FROM data_graduate';

  db.query(sqlStudent, (err, resultStudent) => {
    if (err) {
      console.error('Error querying MySQL for student data:', err);
      res.status(500).json({ error: 'Error querying MySQL for student data' });
      return;
    }

    db.query(sqlGraduate, (err, resultGraduate) => {
      if (err) {
        console.error('Error querying MySQL for graduate data:', err);
        res.status(500).json({ error: 'Error querying MySQL for graduate data' });
        return;
      }

      const allUserData = {
        studentData: resultStudent,
        graduateData: resultGraduate
      };
      res.json(allUserData);
    });
  });
});

app.post('/api/addAssessment', (req, res) => {
  try {
    const { class_year, course_code, name_professor, header, list_1, list_2, list_3, list_4, list_5, list_6, list_7, list_8, list_9, list_10 } = req.body;

    const query = `
      INSERT INTO data_assessment ( class_year, course_code, name_professor, header, list_1, list_2, list_3, list_4, list_5, list_6, list_7, list_8, list_9, list_10 )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [class_year, course_code, name_professor, header, list_1, list_2, list_3, list_4, list_5, list_6, list_7, list_8, list_9, list_10], (error, results) => {
      if (error) {
        console.error('Error adding assessment:', error);
        res.status(500).json({ message: 'Error adding assessment' });
      } else {
        res.status(201).json({
          message: 'assessment added successfully',
        });
      }
    });
  } catch (error) {
    console.error('Error adding assessment:', error);
    res.status(500).json({ message: 'Error adding assessment' });
  }
});

app.put('/data_graduate/update', (req, res) => {
  const userData = req.body;

  // ตรวจสอบว่ามีข้อมูลที่ส่งมาครบหรือไม่
  if (!userData || !userData.user_id) {
    return res.status(400).json({ message: 'Missing user_id or data' });
  }

  // สร้าง query เพื่ออัพเดทข้อมูล salary, work_place, work_about, end_year ของบัณฑิตที่มี user_id ตามที่ระบุ
  const query = `
    UPDATE data_graduate 
    SET salary = ?, work_place = ?, work_about = ?, end_year = ?
    WHERE user_id = ?
  `;

  const { user_id, salary, work_place, work_about, end_year } = userData;

  db.query(query, [salary, work_place, work_about, end_year, user_id], (error, results, fields) => {
    if (error) {
      console.error('Error updating data graduate:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }

    // ตรวจสอบว่ามีข้อมูลของ user_id ที่ระบุหรือไม่
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ส่งข้อความยืนยันการอัพเดทกลับไปยัง client
    res.json({ message: 'Data updated successfully' });
  });
});

app.get('/api/data_assessment', (req, res) => {
  const sql = 'SELECT * FROM data_assessment';
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

app.post('/submit/assessment_votes', async (req, res) => {
    try {
         const { user_id, votes } = req.body;
        // Save assessment votes data to database with user_id
        const savedAssessmentVotes = await AssessmentVote.insertMany({ user_id, votes });
        res.status(201).json(savedAssessmentVotes); // Respond with saved data
    } catch (error) {
        console.error('Error saving assessment votes:', error);
        res.status(500).json({ error: 'An error occurred while saving assessment votes.' });
    }
});

app.post('/api/save-multiple-pdf', upload.array('file'), (req, res) => {
  // Access the uploaded files using req.files
  const files = req.files;
  // Access the selectedExtrapoints data using req.body.selectedExtrapoints
  const selectedExtrapoints = JSON.parse(req.body.selectedExtrapoints);
  
  // Process the files and selectedExtrapoints as needed
  // For example, you can save each file to the server and then save their metadata to the database
  // Here's a simple example to save files to the server and log their metadata:
  files.forEach((file, index) => {
    const fileName = file.originalname;
    const fileSize = file.size;
    const fileType = file.mimetype;
    // Save the file to the server
    const filePath = `uploads/${fileName}`;
    file.mv(filePath, (err) => {
      if (err) {
        console.error(`Error saving file ${fileName}:`, err);
      } else {
        console.log(`File ${fileName} saved successfully.`);
        // Save file metadata and selectedExtrapoints to the database or perform other operations as needed
        // Example: db.saveFileMetadata({ fileName, fileSize, fileType, selectedExtrapoints });
      }
    });
  });

  // Send a response back to the client
  res.status(200).json({ message: 'Files uploaded successfully' });
});

// อัปโหลดไฟล์และบันทึกลงใน MySQL
app.post('api/upload', upload.single('file'), (req, res) => {
  const fileData = req.file;

  if (!fileData) {
    return res.status(400).send('No file uploaded.');
  }

  const { extrapoint_pdf } = fileData;

  // เขียนคำสั่ง SQL INSERT เพื่อบันทึกข้อมูลไฟล์ลงในตาราง
  const sql = 'INSERT INTO Extrapoints (extrapoint_pdf) VALUES (?)';

  db.query(sql, [extrapoint_pdf], (err, result) => {
    if (err) {
      console.error('Error uploading file:', err);
      res.status(500).send('Error uploading file.');
    } else {
      console.log('File uploaded successfully.');
      res.status(200).send('File uploaded successfully.');
    }
  });
});

app.post('/submit-assessment', (req, res) => {
  const  assessmentData  = req.body; // ข้อมูลที่ส่งมาจากหน้าบ้าน

  const sql = `INSERT INTO assessment_votes (user_id, assessment_id, vote_value_1, vote_value_2, vote_value_3, vote_value_4, vote_value_5, vote_value_6, vote_value_7, vote_value_8, vote_value_9, vote_value_10) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;


  // ดึง user_id จาก assessmentData (ถ้ามี)
  const userId = assessmentData[0].user_id;

  // สร้างค่าที่จะแทนที่ ? ในคำสั่ง SQL
  const values = [
    userId,
    assessmentData[0].assessment_id,
    assessmentData[0].vote_value_1|| 0,
    assessmentData[0].vote_value_2|| 0,
    assessmentData[0].vote_value_3|| 0,
    assessmentData[0].vote_value_4|| 0,
    assessmentData[0].vote_value_5|| 0,
    assessmentData[0].vote_value_6 || 0,
    assessmentData[0].vote_value_7 || 0,
    assessmentData[0].vote_value_8 || 0,
    assessmentData[0].vote_value_9 || 0,
    assessmentData[0].vote_value_10 || 0
  ];
  // ส่งคำสั่ง SQL ไปยังฐานข้อมูล
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ', err);
      res.status(500).json({ error: 'พบข้อผิดพลาดในการบันทึกข้อมูล' });
      return;
    }
    console.log('บันทึกข้อมูลสำเร็จ');
    res.status(200).json({ message: 'บันทึกข้อมูลสำเร็จ' });
  });
});


app.get('/api/get-extrapoints', (req, res) => {
  const { id_student } = req.query;

  let sql = 'SELECT * FROM Extrapoints';
  const values = [];

  if (id_student) {
    sql += ' WHERE id_student = ?';
    values.push(id_student);
  }

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      res.status(500).json({ error: 'Error querying MySQL' });
      return;
    }
    res.json(result);
  });
});

app.get('/api/get-assessment-data', (req, res) => {
  const sql = `
    SELECT 
      da.*,
      av.vote_value_1,
      av.vote_value_2,
      av.vote_value_3,
      av.vote_value_4,
      av.vote_value_5,
      av.vote_value_6,
      av.vote_value_7,
      av.vote_value_8,
      av.vote_value_9,
      av.vote_value_10,
      ds.id_student as student_id,
      ds.first_name,
      ds.last_name,
      ds.faculty,
      ds.branch,
      ds.gender
    FROM 
      data_assessment da
    LEFT JOIN 
      assessment_votes av 
    ON 
      da.id = av.assessment_id
    LEFT JOIN
      data_student ds
    ON
      av.user_id = ds.user_id`;
      
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      res.status(500).json({ error: 'Error querying MySQL' });
      return;
    }
    res.json(result);
  });
});


// app.post('/upload/', upload.single('imageFile'), (req, res) => {
//   const { extrapoint_id, first_name, last_name, clause, list, points, id_student, imageFile } = req.body;

//   const query = 'INSERT INTO Extrapoints (extrapoint_pdf, first_name, last_name, clause, list, points, id_student) VALUES (?, ?, ?, ?, ?, ?, ?)';

//   console.log('imageFile -> ', imageFile); // แสดงข้อมูลของไฟล์ที่อัปโหลด
//   console.log('body -> ', req.body); // แสดงข้อมูลอื่นๆ ที่ถูกส่งมากับคำขอ
//   db.query(query, [imageFile, first_name, last_name, clause, list, points, id_student], (err, result) => {
//     if (err) {
//       console.error('Error inserting file into database:', err);
//       res.status(500).json({ error: 'Internal Server Error' });
//       return;
//     }

//     res.json({ message: 'File uploaded successfully!' });
//   });
// });

app.get('/t', (_,res) => res.json({}));

app.get("/file/:file_name", async (req, res) => {
  const file_name = req.params.file_name;
  const file = new File(`uploads/${file_name}`);
  const blob = new Blob([file.buffer]);
  
  const reader = new FileReader();
  
  reader.onload = () => {
    const text = reader.result;
    res.send(text);
  };
  
  reader.onerror = (error) => {
    console.error('Error reading file:', error);
    res.status(500).send('Error reading file');
  };
  
  reader.readAsText(blob);
});

// สร้าง endpoint เพื่อดึงข้อมูลจากฐานข้อมูล
app.get('/data_student', (req, res) => {
  db.query('SELECT * FROM data_student', (error, results, fields) => {
    if (error) throw error;
    res.json(results);
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

app.put('/extrapoints/:extrapoint_id', async (req, res) => {
  try {
    const { extrapoint_id } = req.params;
    const { Check_id, professor_check } = req.body; // เพิ่ม professor_check ในการรับข้อมูลจาก body

    const sql = 'UPDATE Extrapoints SET Check_id = ?, professor_check = ? WHERE extrapoint_id = ?'; // เพิ่ม professor_check ในคำสั่ง SQL
    db.query(sql, [Check_id, professor_check, extrapoint_id], (err, result) => {
      if (err) {
        console.error('Error updating Check_id:', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
      }
      res.status(200).json({ message: 'Updated successfully' });
    });
  } catch (error) {
    console.error('Error updating Check_id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/get-check-extrapoints', (req, res) => {
  const sql = 'SELECT * FROM Extrapoints WHERE Check_id = 0'; // เพิ่ม WHERE Check_id = 0 เข้าไปในคำสั่ง SQL
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      res.status(500).json({ error: 'Error querying MySQL' });
      return;
    }
    res.json(result);
  });
});

app.get('/api/get-sum-points', (req, res) => {
  const query = `
    SELECT
      id_student,
      CONCAT(first_name, ' ', last_name) AS full_name,
      SUM(points) AS sum_points
    FROM
      Extrapoints
    WHERE
      Check_id = 1
    GROUP BY
      id_student;
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching sum of points:', error);
      res.status(500).json({ message: 'Error fetching sum of points' });
    } else {
      res.status(200).json(results);
    }
  });
});

app.put('/api/update-user-data', (req, res) => {
  const userData = req.body;
  const userId = userData.user_id;

  const sqlStudent = `UPDATE data_student SET 
      first_name = ?, 
      last_name = ?, 
      id_student = ?, 
      faculty = ?, 
      branch = ?, 
      class_year = ?, 
      gender = ?
      WHERE user_id = ?`;

  const sqlGraduate = `UPDATE data_graduate SET 
      first_name = ?, 
      last_name = ?, 
      id_graduate = ?, 
      faculty = ?, 
      branch = ?, 
      class_year = ?, 
      gender = ?
      WHERE user_id = ?`;

  db.query(sqlStudent, [
      userData.first_name,
      userData.last_name,
      userData.id_student,
      userData.faculty,
      userData.branch,
      userData.class_year,
      userData.gender,
      userId
  ], (errStudent, resultStudent) => {
      if (errStudent) {
          console.error('Error updating student data:', errStudent);
          res.status(500).json({ error: 'Failed to update student data' });
          return;
      }

      db.query(sqlGraduate, [
          userData.first_name,
          userData.last_name,
          userData.id_graduate,
          userData.faculty,
          userData.branch,
          userData.class_year,
          userData.gender,
          userId
      ], (errGraduate, resultGraduate) => {
          if (errGraduate) {
              console.error('Error updating graduate data:', errGraduate);
              res.status(500).json({ error: 'Failed to update graduate data' });
              return;
          }

          console.log('User data updated successfully');
          res.status(200).json({ message: 'User data updated successfully' });
      });
  });
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const oldUser = await User.findOne({ email });
    if (!oldUser) {
      return res.json({ status: "User Not Exists!!" });
    }
    const secret = JWT_SECRET + oldUser.password;
    const token = jwt.sign({ email: oldUser.email, id: oldUser._id }, secret, {
      expiresIn: "5m",
    });
    const link = `http://localhost:8081/reset-password/${oldUser._id}/${token}`;
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "adarsh438tcsckandivali@gmail.com",
        pass: "rmdklolcsmswvyfw",
      },
    });

    var mailOptions = {
      from: "youremail@gmail.com",
      to: "thedebugarena@gmail.com",
      subject: "Password Reset",
      text: link,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    console.log(link);
  } catch (error) { }
});

app.get("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  console.log(req.params);
  const oldUser = await User.findOne({ _id: id });
  if (!oldUser) {
    return res.json({ status: "User Not Exists!!" });
  }
  const secret = JWT_SECRET + oldUser.password;
  try {
    const verify = jwt.verify(token, secret);
    res.render("index", { email: verify.email, status: "Not Verified" });
  } catch (error) {
    console.log(error);
    res.send("Not Verified");
  }
});

app.post("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  const oldUser = await User.findOne({ _id: id });
  if (!oldUser) {
    return res.json({ status: "User Not Exists!!" });
  }
  const secret = JWT_SECRET + oldUser.password;
  try {
    const verify = jwt.verify(token, secret);
    const encryptedPassword = await bcrypt.hash(password, 10);
    await User.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          password: encryptedPassword,
        },
      }
    );

    res.render("index", { email: verify.email, status: "verified" });
  } catch (error) {
    console.log(error);
    res.json({ status: "Something Went Wrong" });
  }
});

module.exports = app;
