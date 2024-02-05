const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
const { getDownloadURL } = require("firebase-admin/storage");
const { v4: uuidv4 } = require("uuid"); // Import uuid
const { storage, database } = require("./firebase");
const bodyParser = require("body-parser");
const app = express();
const upload = multer();
const port = 3000;
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/upload", upload.single("pdf"), async (req, res) => {
  const { originalname, buffer } = req.file;
  const { dept, sem, year, subject } = req.body;
  const PaperName = `${dept}-${sem}-${subject}-${year}`;
  const fileName = originalname;

  try {
    // Generate a unique ID using uuid
    const uuid = uuidv4();

    // Save file to Firebase Storage with metadata
    const file = storage.bucket().file(`Papers/${PaperName}.pdf`);
    const stream = file.createWriteStream({
      metadata: {
        contentType: "application/pdf",
        metadata: {
          firebaseStorageDownloadTokens: uuid, // Embed uuid in metadata
        },
      },
      resumable: false,
    });

    stream.on("finish", async () => {
      try {
        // Get the download URL with a token using the Admin SDK
        const downloadURL = await getDownloadURL(file);
        // Add file details to Firebase Realtime Database
        const fileData = {
          dept: dept,
          sem: sem,
          paperName: PaperName,
          paperUrl: downloadURL,
          subject: subject,
          year: year,
        };

        // Save data to Realtime Database with PaperName as the key
        const paperRef = database.ref("/papers").child(PaperName);
        await paperRef.set(fileData);

        console.log("PDF uploaded and data saved:", paperRef.key);
        res.redirect("/");
      } catch (error) {
        console.error("Error generating download URL:", error);
        res.status(500).json({ error: "Error generating download URL" });
      }
    });

    // Write the buffer to the storage stream
    stream.end(buffer);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/view", async (req, res) => {
  try {
    // Fetch data from Firebase Realtime Database
    const snapshot = await database.ref("/papers").once("value");
    const data = snapshot.val();
    const papers = Object.values(data || {}); // Convert object to array

    // Render viewData.html and pass papers data to it
    res.render("viewData", { papers });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/download/:paperId", async (req, res) => {
  try {
    const paperId = req.params.paperId;

    // Fetch the paper details from Firebase Realtime Database
    const snapshot = await database.ref(`/papers/${paperId}`).once("value");
    const paper = snapshot.val();

    if (paper) {
      // Redirect to the paper URL
      res.redirect(paper.paperUrl);
    } else {
      res.status(404).json({ error: "Paper not found" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/delete/:paperId", async (req, res) => {
  try {
    const paperId = req.params.paperId;

    // Get the file name from the Realtime Database
    const snapshot = await database.ref(`/papers/${paperId}`).once("value");
    const paper = snapshot.val();

    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }

    const { paperName } = paper;

    // Delete file from Firebase Storage
    const file = storage.bucket().file(`Papers/${paperId}.pdf`);
    await file.delete();

    // Delete data from Firebase Realtime Database
    await database.ref(`/papers/${paperId}`).remove();

    console.log(
      `Paper with ID ${paperId} deleted from Storage and Realtime Database.`
    );
    res.redirect("/view");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
//edit route goes here
// Add this route for editing data
app.get("/edit/:paperId", async (req, res) => {
  try {
    const paperId = req.params.paperId;

    console.log("paperId:", paperId); // Add this line for debugging

    // Fetch the paper details from Firebase Realtime Database
    const snapshot = await database.ref(`/papers/${paperId}`).once("value");
    const paper = snapshot.val();

    if (paper) {
      // Render the edit page and pass the paper data to it
      res.render("viewData", { paper }); // Update the view file name
    } else {
      res.status(404).json({ error: "Paper not found" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/edit", async (req, res) => {
  try {
    const { paperName, dept, sem, subject, year } = req.body;

    // Update data in Firebase Realtime Database
    const paperRef = database.ref(`/papers/${paperName}`);
    await paperRef.update({
      dept: dept,
      sem: sem,
      subject: subject,
      year: year,
    });

    console.log(`Paper with ID ${paperName} updated in Realtime Database.`);
    res.redirect("/view");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/dept", (req, res) => {
  res.sendFile(__dirname + "/addDept.html");
});

app.post("/addDept", async (req, res) => {
  try {
    const { dept } = req.body;

    // Add the new department to the Realtime Database under the 'departments' node
    const departmentRef = database.ref("/departments").child(dept);
    await departmentRef.set({
      name: dept,
    });

    console.log(`Department ${dept} added to Realtime Database`);
    res.status(200).send(`Department ${dept} added to Realtime Database`);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/departments", async (req, res) => {
  try {
    const snapshot = await database.ref("/departments").once("value");
    const data = snapshot.val();
    const departments = Object.values(data || {});
    res.json(departments);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Update your server-side code

// Add a route to fetch the list of departments
app.get("/department", async (req, res) => {
  try {
    const snapshot = await database.ref("/departments").once("value");
    const data = snapshot.val();
    const departments = Object.keys(data || {});
    res.json(departments);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ... (existing code)

app.get("/departments/:dept", async (req, res) => {
  try {
    const deptName = req.params.dept;
    const snapshot = await database
      .ref(`/departments/${deptName}`)
      .once("value");
    const department = snapshot.val();

    if (department) {
      // Extract semester names and details from the semesters node
      const semesters = Object.values(department.semesters || {});
      res.json(semesters);
    } else {
      res.json([]); // Return an empty array if the department is not found
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Add a new route to handle subject addition
// Add a route to render addSub.html
app.get("/addSub", (req, res) => {
  res.sendFile(__dirname + "/addSub.html");
});
app.post("/addSubject", async (req, res) => {
  try {
    const { dept, subjectName } = req.body;

    // Check if dept is defined and has a value
    if (!dept || dept.trim() === "") {
      return res.status(400).json({ error: "Department is required" });
    }

    // Fetch the current count of subjects for the selected department
    const snapshot = await database.ref(`/subjects/${dept}`).once("value");
    const subjects = snapshot.val() || {};
    const subjectCount = Object.keys(subjects).length + 1;

    // Create a new subject key-value pair under the selected department
    const subjectKey = `sub-${subjectCount}`;
    const subjectNode = {};
    subjectNode[subjectKey] = subjectName;

    // Add the new subject under the selected department
    await database.ref(`/subjects/${dept}`).update(subjectNode);

    console.log(
      `Subject ${subjectKey}: ${subjectName} added under department ${dept}`
    );
    res
      .status(200)
      .send(`Subject ${subjectKey}: ${subjectName} added successfully`);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// ... (existing code)

// Add a new route to handle subjects for a specific department
app.get("/subjects/:dept", async (req, res) => {
  try {
    const deptName = req.params.dept;
    const snapshot = await database.ref(`/subjects/${deptName}`).once("value");
    const subjects = snapshot.val();

    res.json(subjects || {}); // Return the subjects or an empty object
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Change from "/departments" to "/viewdepts"
app.get("/viewdepts", async (req, res) => {
    try {
      const snapshot = await database.ref("/departments").once("value");
      const data = snapshot.val();
      const departments = Object.values(data || {});
  
      res.render("viewDepts", { departments }); // Use "viewDepts" as the EJS file
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete("/deleteDepartment/:deptName", async (req, res) => {
    try {
      const deptName = req.params.deptName;
  
      // Check if the department exists
      const snapshot = await database.ref(`/departments/${deptName}`).once("value");
      const department = snapshot.val();
  
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
  
      // Delete the department from Firebase Realtime Database
      await database.ref(`/departments/${deptName}`).remove();
  
      console.log(`Department ${deptName} deleted from Realtime Database.`);
      res.status(200).send(`Department ${deptName} deleted successfully.`);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  
app.listen(3000, () => {
  console.log(`Server is running at port http://localhost:${port}`);
});
