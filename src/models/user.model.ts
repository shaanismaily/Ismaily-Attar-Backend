import mongoose, { Model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";

interface IUser {
  fullName: string;
  phone?: string;
  email: string;
  password: string;
  role: "admin" | "user";
  refreshToken?: string
}

interface UserModel extends Model<IUser, {}, IUserMethods> {}

const userSchema = new Schema<IUser, Model<IUser>, IUserMethods>({
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    phone: {
        type: String,
        match: /^\+?[1-9]\d{1,14}$/
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
        
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user",
        required: true
    },
    refreshToken: {
        type: String,
    }
}, {timestamps: true})

interface IUserMethods {
  isPasswordCorrect(password: string): Promise<boolean>;

  generateAccessToken(): string;

  generateRefreshToken(): string;
}

userSchema.pre("save", async function() {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.isPasswordCorrect = async function(password: string) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function (): string {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  const expiry = process.env.ACCESS_TOKEN_EXPIRY;

  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }

  if (!expiry) {
    throw new Error("ACCESS_TOKEN_EXPIRY is not defined");
  }

  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
    },
    secret,
    {
      expiresIn: expiry as SignOptions["expiresIn"],
    }
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  const expiry = process.env.REFRESH_TOKEN_EXPIRY;

  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }

  if (!expiry) {
    throw new Error("REFRESH_TOKEN_EXPIRY is not defined");
  }

  return jwt.sign(
    {
      _id: this._id,
    },
    secret,
    {
      expiresIn: expiry as SignOptions["expiresIn"],
    }
  );
};

export const User = mongoose.model<IUser, UserModel>("User", userSchema);