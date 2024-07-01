import bodyParser from "body-parser";
import express from "express";
import pg from "pg";
import axios from "axios";
import env from "dotenv";

const app = express();
const port = 3000;
env.config();
let currentId = 1;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
let userData = { title: "Harry potter and the prisoner of azkaban" };
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function getallBooks() {
  const response = await db.query("SELECT * FROM books");
  console.log(response.rows);
  return response.rows;
}

db.connect();
app.get("/", async (req, res) => {
  const getAll = await getallBooks();
  res.render("index.ejs", {
    getAll,
  });
});

app.get("/add", async (req, res) => {
  const allId = await getallBooks();
  let idList = [];
  allId.forEach((id) => {
    idList.push(id.id);
  });
  currentId = Math.max(...idList) + 1;
  res.render("add.ejs");
});

app.post("/new", async (req, res) => {
  console.log(req.body);
  userData = req.body;

  const response = await axios.get(process.env.API_ENDPT, {
    params: {
      title: userData.title,
    },
  });
  const coverId = response.data["docs"][0]["cover_edition_key"];
  const authorName = response.data["docs"][0]["author_name"];
  const titleName = response.data["docs"][0].title;
  const rating = response.data["docs"][0].ratings_average;
  const imgUrl = `${process.env.IMG_ENDPT}${coverId}-L.jpg`;
  try {
    const formattedRating =
      typeof rating === "number" ? rating.toFixed(1) : 0.0;

    const bookData = await db.query(
      "INSERT INTO books(title, author_name, ratings, image_url) VALUES($1, $2, $3, $4)",
      [titleName, authorName[0], formattedRating, imgUrl]
    );

    console.log("Book data inserted successfully:", bookData);
  } catch (error) {
    console.error("Error inserting book data:", error);
  }
  const keyPoints = await db.query(
    "INSERT INTO keynotes(keynote,book_id) VALUES($1,$2)",
    [userData.keypoints, currentId]
  );
  res.redirect("/");
});

app.get("/show", async (req, res) => {
  const data = req.query.id;
  console.log(parseInt(data));
  const book = await db.query(
    "SELECT * FROM books JOIN keynotes ON books.id=keynotes.book_id WHERE books.id=$1",
    [parseInt(data)]
  );
  console.log(book.rows);
  res.render("show.ejs", { book: book.rows });
});

app.get("/delete", async (req, res) => {
  const id = parseInt(req.query.id);
  const deleteNote = await db.query("DELETE FROM keynotes WHERE book_id=$1", [
    id,
  ]);
  const deleteBook = await db.query("DELETE FROM books WHERE id=$1", [id]);

  res.redirect("/");
});

app.get("/title-sort", async (req, res) => {
  const dataSortBytitle = await db.query("SELECT * FROM books ORDER BY title");
  res.render("index.ejs", { getAll: dataSortBytitle.rows });
});

app.get("/date-sort", async (req, res) => {
  const dataSortBydate = await db.query(
    "SELECT * FROM books ORDER BY created_at"
  );
  res.render("index.ejs", { getAll: dataSortBydate.rows });
});

app.get("/author-sort", async (req, res) => {
  const dataSortByauthor = await db.query(
    "SELECT * FROM books ORDER BY author_name"
  );
  res.render("index.ejs", { getAll: dataSortByauthor.rows });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
