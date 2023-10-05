// DOTENV
require('dotenv').config();

const { User } = require('./../models');
const Joi = require('joi');
const { Op } = require('sequelize');

// DECLARE PASSPORT AUTH JSON WEBTOKEN BEARER SCHEMA
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const secretKey = process.env.SECRET_KEY;

const jwtOptions = {
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: secretKey,
};

passport.use(
  new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
  }, async (email, password, done) => {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return done(null, false, { message: 'Email tidak ditemukan.' });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false, { message: 'Password salah.' });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.use(
  new JwtStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: secretKey,
  }, async (payload, done) => {
    try {
      const user = await User.findByPk(payload.id);
      console.log(user);
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

// CONTROLLER
const userController = {
  login: (req, res, next) => {
    const { error } = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }).validate(req.body);

    if (error) {
      return res.status(400).json(error);
    }

    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err || !user) {
        return res.status(400).json({ message: info ? info.message : 'Kredensial tidak valid' });
      }
      req.login(user, { session: false }, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Terjadi kesalahan saat login.' });
        }
        // redisClient.set(`user:${user.id}`, JSON.stringify(user), 'EX', 3600, (redisErr) => {
        //   if (redisErr) {
        //     console.error('Gagal menyimpan data di Redis:', redisErr);
        //   }
        // });
        user.dataValues.token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });
        return res.status(200).json(user);
      });
    })(req, res, next);
  },
  register: async (req, res, next) => {

    const { error } = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }).validate(req.body);

    if (error) {
      return res.status(400).json(error);
    }

    console.log(req.body);

    const { name, email, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      await User.create({ name, email, password: hashedPassword, role, value: 0 });
      return res.status(201).json({ message: 'User berhasil dibuat.' });
    } catch (error) {
      console.error('Error Membuat User Baru: ', error);
      return res.status(500).json({ message: 'Error Membuat User Baru', error });
    }
  },
  getAuthUser: async (req, res) => {
    const authenticatedUser = req.user;
    res.json(authenticatedUser);
  },
  updateAuthUser: async (req, res) => {
    const updatedData = req.body;
    try {
      const [updatedRowCount, updatedUsers] = await User.update(updatedData, {
        where: { id: req.user.id },
        returning: true
      });
      if (updatedRowCount === 0) {
        res.status(404).json({ message: 'Dia ngga ada bang' });
      } else {
        res.json({ message: 'Berhasil diupdate' });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  getUsers: async (req, res) => {
    try {
      let users = [];
      let message = '';
      
      if (Object.keys(req.query).length === 0) {
        users = await User.findAll();
        message = 'All Users';
      } else {
        const whereClause = {};

        if (req.query.name) {
          whereClause.name = { [Op.like]: `%${req.query.name}%` };
        }

        if (req.query.email) {
          whereClause.email = req.query.email;
        }

        if (req.query.role) {
          whereClause.role = req.query.role;
        }

        if (req.query.value) {
          whereClause.value = req.query.value;
        }

        users = await User.findAll({
          attributes: { exclude: ['password'] },
          where: whereClause
        });

        users.length > 0 ? message = users.length + ' users found' : message = 'User not found';
        
      }

      return res.status(200).json({
        message: message,
        total: users.length,
        data: users
      });
    } catch (error) {
      console.error('Error requesting user data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  getUserById: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (user) {
        res.json(user);
        return user;
      } else {
        res.status(404).json({ message: 'Dia ngga ada masbro' });
      }
    } catch (error) {
      console.error('Error minta data user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  getUserByEmail: async (req, res) => {
    try {
      const user = await User.findOne({ where: { email: req.params.email } });
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: 'Dia ngga ada masbro' });
      }
    } catch (error) {
      console.error('Error minta data user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  deleteUserById: async (req, res) => {
    try {
      if(req.user.id != req.body.id) {
        if(req.user.role == "teacher") {
          const user = await User.destroy({ where: { id: req.params.id } });
          if (user) {
            res.status(200).json({ message: 'Dia udah diusir masbro' });
          } else {
            res.status(404).json({ message: 'Dia emang udah ngga ada masbro' });
          }
        } else {
          res.status(401).json({ message: 'Lu cuma seorang murid, tidak menghapus sembarangan orang' });
        }
      } else {
        res.status(401).json({ message: 'Lu kaga bisa ngapus diri sendiri masbro' });
      }
    } catch (error) {
      console.error('Error delete user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  deleteUserByEmail: async (req, res) => {
    try {
      if(req.user.email != req.body.email) {
        if(req.user.role == "teacher") {
          const user = await User.destroy({ where: { email: req.params.email } });
          if (user) {
            res.status(200).json({ message: 'Dia udah diusir masbro' });
          } else {
            res.status(404).json({ message: 'Dia emang udah ngga ada masbro' });
          }
        } else {
          res.status(401).json({ message: 'Lu cuma seorang murid, tidak menghapus sembarangan orang' });
        }
      } else {
        res.status(401).json({ message: 'Lu kaga bisa ngapus diri sendiri masbro' });
      }
    } catch (error) {
      console.error('Error delete user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports = userController;