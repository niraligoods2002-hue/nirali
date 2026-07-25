# Backend TODO

- [ ] Update/add backend folder structure under `mern-app/server/`
- [x] Update `mern-app/server/package.json` dependencies (express/mongoose/dotenv/cors/morgan/multer) and keep `nodemon` as dev dep

- [x] Create `config/db.js` with MongoDB connect function

- [x] Create `models/Product.js` schema

- [x] Create `controllers/productController.js` with:

  - [x] createProduct (POST /api/products)

  - [x] getAllProducts (GET /api/products)
  - [x] getProductBySlug (GET /api/products/:slug)

- [x] Create `routes/productRoutes.js` and mount routes

- [x] Refactor `server.js` to:

  - [x] use morgan + cors + express.json

  - [x] call `connectDB()`

  - [x] mount `/api/products` routes

- [x] Create `uploads/.gitkeep`

- [ ] Run `npm install` and start backend (`npm run dev`)
- [ ] Test:

  - [ ] GET http://localhost:5000/api/products
  - [ ] GET http://localhost:5000/api/products/:slug (after inserting a doc)
  - [ ] POST /api/products via Postman
