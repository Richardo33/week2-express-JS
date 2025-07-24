import express from "express";
import { Pool } from 'pg'
import multer from "multer";
import bcrypt from "bcrypt";
import session from "express-session";

const upload = multer(); // tidak menyimpan file untuk sekarang


const db = new Pool({
  user: 'postgres',
  password: 'Development1',
  host: 'localhost',
  port: 5432,
  database: 'personal_web',
  max: 20,
})

db.connect()
const app = express();
const port = 3000;

app.set("view engine", "hbs");
app.set("views", "src/views");

app.use("/assets", express.static("src/assets"));
// app.use('/icons', express.static('src/assets/uploads/icons'));

app.use(
  session({
    secret: "rahasia-super-aman", // ganti ini jadi rahasia produksi
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // jika di HTTPS, ubah ke true
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


app.use(express.urlencoded({ extended: false }));

function getTechIconPath(techName) {
  const map = {
    'Node JS': '/assets/uploads/icon/node-js.png',
    'Next JS': '/assets/uploads/icon/nextJs.png',
    'React JS': '/assets/uploads/icon/reactJs.png',
    'TypeScript': '/assets/uploads/icon/typescript.png',
  };
  return map[techName] || '/assets/uploads/icon/monster.webp';
}

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});


app.get("/task2", (req, res) => {
  res.render("task2");
});

app.get("/task3", (req, res) => {
  res.render("task3");
});

function mustLoggin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.render("login", { error: "Email Salah / Email Tidak Ditemukan" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render("login", { error: "Password salah" });
    }

    // Simpan data user di session
    req.session.user = {
      id: user.user_id,
      name: user.name,
      email: user.email
    };

    res.redirect("/task4");
  } catch (error) {
    console.error("Gagal login:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Cek apakah email sudah digunakan
    const existingUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.render("register", { error: "Email is already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan ke database
    await db.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)`,
      [name, email, hashedPassword]
    );

    // Redirect ke login
    res.redirect("/login");
  } catch (error) {
    console.error("Gagal register:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/task4", mustLoggin, async (req, res) => {
  try {
    const userId = req.session.user?.id;

    // Ambil hanya project milik user yang login
    const projectsResult = await db.query(
      `SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const projects = projectsResult.rows.map(project => {
      const start = new Date(project.start_date);
      const end = new Date(project.end_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;

      const duration =
        (months > 0 ? `${months} bulan ` : "") +
        (days > 0 ? `${days} hari` : "") ||
        "0 hari";

      return {
        ...project,
        duration
      };
    });

    // Ambil teknologi untuk project milik user ini
    const techMapResult = await db.query(
      `
      SELECT pt.project_id, t.tech_name
      FROM project_technologies pt
      JOIN technologies t ON pt.tech_id = t.tech_id
      WHERE pt.project_id = ANY (
        SELECT project_id FROM projects WHERE user_id = $1
      )
      `,
      [userId]
    );

    const techMap = {};
    techMapResult.rows.forEach(({ project_id, tech_name }) => {
      if (!techMap[project_id]) techMap[project_id] = [];
      techMap[project_id].push(tech_name);
    });

    const projectsWithTech = projects.map(project => {
      const techs = techMap[project.project_id] || [];
      const techIconsHTML = techs.map(techName => {
        const iconPath = getTechIconPath(techName);
        return `<img src="${iconPath}" alt="${techName}" class="tech-icon" title="${techName}" />`;
      }).join(' ');

      return {
        ...project,
        techHTML: techIconsHTML,
        imgSrc: project.image_url
          ? `/${project.image_url}`  // pastikan path ini sesuai
          : `/assets/uploads/icon/monster.webp`
      };
    });

    res.render("task4", { projects: projectsWithTech });
  } catch (error) {
    console.error("Gagal menampilkan project:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/task4", mustLoggin, upload.single('imageUpload'), async (req, res) => {
  const { projectName, startDate, endDate, description, tech } = req.body;
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).send("Unauthorized. Please login first.");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO projects (project_name, start_date, end_date, description, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING project_id`,
      [projectName, startDate, endDate, description, userId]
    );

    const projectId = result.rows[0].project_id;

    const techArray = Array.isArray(tech) ? tech : (tech ? [tech] : []);
    for (const techName of techArray) {
      const techResult = await client.query(
        `SELECT tech_id FROM technologies WHERE LOWER(tech_name) = LOWER($1)`,
        [techName]
      );
      if (techResult.rows.length > 0) {
        const techId = techResult.rows[0].tech_id;
        await client.query(
          `INSERT INTO project_technologies (project_id, tech_id)
           VALUES ($1, $2)`,
          [projectId, techId]
        );
      }
    }

    await client.query("COMMIT");
    res.redirect("/task4");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Gagal menyimpan project:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    client.release();
  }
});

app.post("/task4/delete/:id", mustLoggin, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  try {
    const result = await db.query(
      `DELETE FROM projects WHERE project_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      // Tidak ada project terhapus → kemungkinan bukan milik user ini
      return res.status(403).send("Kamu tidak memiliki izin untuk menghapus project ini.");
    }

    res.redirect("/task4");
  } catch (error) {
    console.error("Gagal menghapus project:", error);
    res.status(500).send("Gagal menghapus project");
  }
});


app.listen(port, () => {
  console.log(`Server on http://localhost:${port}`);
});
