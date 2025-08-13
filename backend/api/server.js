// Define allowed origins
const allowedOrigins = ['https://local-effort-app.vercel.app'];

const options = {
  origin: allowedOrigins
};

// Then pass these options to cors
app.use(cors(options));