import express from "express";
const app = express();
const port = 3000;

app.set("view engine", "hbs");
app.set("views", "src/views");

app.use("/assets", express.static("src/assets"));

app.get("/task2", (req, res) => {
  res.render("task2");
});

app.get("/task3", (req, res) => {
  res.render("task3");
});

app.get("/task4", (req, res) => {
  res.render("task4");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
