const { Project } = require('./../models');
const Joi = require('joi');

// CONTROLLER
const groupController = {

  getProjects: (req, res) => {
    Project.findAll()
      .then(projects => res.json(projects))
      .catch(err => res.status(400).json('Error: ' + err));
  },
  createProject: async (req, res) => {
    const { error } = Joi.object({
      name: Joi.string().required(),
      description: Joi.string().required(),
      member: Joi.string().required()
    }).validate(req.body);

    if (error) {
      return res.status(400).json(error);
    }

    console.log(req.body);

    const { name, description, member } = req.body;
    const admin = req.user.id;

    try {
      await Project.create({ name, description, admin, member });
      return res.status(201).json({ message: 'Project berhasil dibuat.' });
    } catch (error) {
      console.error('Error Membuat Project Baru: ', error);
      return res.status(500).json({ message: 'Error Membuat Project Baru', error });
    }
  },
  updateGroup: (req, res) => {
    const where = {
      admin: req.user.id,
      id: req.body.id
    };

    Group.findOne({ where: where }).then((group) => {
      if (!group) {
        return res.status(404).json({ message: 'Group tidak ditemukan.' });
      }

      const values = {};

      if (req.body.name && group.name !== req.body.name) {
        values.name = req.body.name;
      }

      if (req.body.description && group.description !== req.body.description) {
        values.description = req.body.description;
      }

      if (req.body.member && group.member !== req.body.member) {
        values.member = req.body.member;
      }

      if (Object.keys(values).length === 0) {
        return res.status(400).json({ message: 'Tidak ada data yang diubah.' });
      }

      group.update(values).then(() => {
        return res.status(201).json({ message: 'Group berhasil diupdate.', data: values });
      }).catch((error) => {
        return res.status(500).json({ message: 'Internal server error', error });
      });

    }).catch((error) => {
      return res.status(500).json({ message: 'Error in findOne', error });
    });
  },
  deleteGroup: (req, res) => {
    Group.destroy({
      where: {
        id: req.params.id
      }
    }).then(() => {
      return res.status(200).json({ message: 'Group berhasil dihapus.' });
    }).catch((error) => {
      return res.status(500).json({ message: 'Internal server error', error });
    })
  }

}

module.exports = groupController;