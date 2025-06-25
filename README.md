# 🛒 MarketPlace Management System

The **MarketPlace Management System** is a full-stack web application built for managing a digital marketplace. It provides features for product management, vendor registration, user login, order processing, and admin monitoring.

---

## 🔧 Features

- 🧑‍💼 **Vendor Panel**
  - Register and log in as a vendor
  - Add, update, or delete products
  - View orders placed by customers

- 👥 **Customer Panel**
  - User registration and login
  - Browse products
  - Add to cart and place orders

- 🛠️ **Admin Panel**
  - Monitor vendors and customers
  - Manage product listings
  - View sales and analytics

---

## 🗂️ Folder Structure

```
MarketPlace-Management/
├── public/               # Frontend assets (HTML/CSS/JS)
│   ├── css/
│   ├── js/
│   ├── images/
│   └── html/
├── server.js             # Main backend entry point
├── package.json
├── package-lock.json
└── README.md             # Project documentation
```

---

## 💻 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Authentication:** Session-based (or JWT)
- **Hashing:** bcrypt for secure password storage

---

## 🚀 How to Run Locally

1. **Clone the Repository**
   ```bash
   git clone https://github.com/PradyumnaReddy4/MarketPlace-Management.git
   cd MarketPlace-Management
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Database**
   - Set up a MySQL database
   - Update DB credentials in `server.js`:
     ```js
     const connection = mysql.createConnection({
       host: 'localhost',
       user: 'root',
       password: 'your_database_password',
       database: 'your_database_name'
     });
     ```

4. **Start the Server**
   ```bash
   node server.js
   ```

5. **Visit in Browser**
   ```
   http://localhost:3000
   ```

---

## 🛡️ Security

- Passwords are hashed using `bcrypt`
- Role-based access for admin, vendor, and users
- Input validation on both client and server

---

## 📬 Contact

Created by [Pradyumna Reddy](https://github.com/PradyumnaReddy4)

Feel free to fork or contribute!
