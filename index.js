import express from "express";
import { Pool } from 'pg'
import multer from "multer";
import bcrypt from "bcrypt";

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
app.use('/icons', express.static('src/assets/uploads/icons'));

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

app.get("/task2", (req, res) => {
  res.render("task2");
});

app.get("/task3", (req, res) => {
  res.render("task3");
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

app.get("/task4", async (req, res) => {
  try {
    const projectsResult = await db.query(`
      SELECT * FROM projects ORDER BY created_at DESC
    `);

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

    const techMapResult = await db.query(`
      SELECT pt.project_id, t.tech_name
      FROM project_technologies pt
      JOIN technologies t ON pt.tech_id = t.tech_id
    `);

    // Buat map project_id ke array tech_name
    const techMap = {};
    techMapResult.rows.forEach(({ project_id, tech_name }) => {
      if (!techMap[project_id]) techMap[project_id] = [];
      techMap[project_id].push(tech_name);
    });
    // console.log(techMap);


    // Map projects dengan icon teknologi
    const projectsWithTech = projects.map(project => {
      const techs = techMap[project.project_id] || [];
      const techIconsHTML = techs.map(techName => {
        const iconPath = getTechIconPath(techName);
        return `<img src="${iconPath}" alt="${techName}" class="tech-icon" title="${techName}" />`;
      }).join(' ');



      return {
        ...project,
        techHTML: techIconsHTML,
        imgSrc: project.image
          ? `/uploads/${project.image}`
          : `/assets/uploads/icon/monster.webp`
      };
    });
    console.log(projectsWithTech);

    res.render("task4", { projects: projectsWithTech });
  } catch (error) {
    console.error("Gagal menampilkan project:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/task4", upload.single('imageUpload'), async (req, res) => {
  const { projectName, startDate, endDate, description, tech } = req.body;
  // console.log("File info:", req.file);
  // console.log("Tech submitted from form:", tech);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO projects (project_name, start_date, end_date, description)
        VALUES ($1, $2, $3, $4)
        RETURNING project_id`,
      [projectName, startDate, endDate, description]
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


app.post("/task4/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM projects WHERE project_id = $1", [id]);
    res.redirect("/task4");
  } catch (error) {
    console.error("Gagal menghapus project:", error);
    res.status(500).send("Gagal menghapus project");
  }
});

app.listen(port, () => {
  console.log(`Server on http://localhost:${port}`);
});
