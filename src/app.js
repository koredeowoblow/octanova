import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import helmet from "helmet";
import { connectDB } from "./config/database.js";
import { specs } from "./config/swagger.js";
import errorHandler from "./middleware/errorMiddleware.js";
import { errors } from "web3";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use("/uploads", express.static("upload"));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
  })
);

app.use(errorHandler);
app.use((res, req) => {
  res.statusCode(400).json({
    status: "error",
    message: "Route not found",
  });
});
const PORT = process.env.PORT || 3001;
const startServer = async () => {
  try {
    await connectDB();
    console.log(process.env.DB_Host);
    app.listen(PORT, () => {
      console.log(`server running on port ${PORT}`);
      console.log(
        `Swagger documentation available at http://localhost:${PORT}/api-docs`
      );
    });
  } catch(error) {
    console.error('failed to start server:',error);
    process.exit(1);    
  }
};

startServer();