const { Chat } = require('./../models');
const crypto = require('crypto');

const encryptMessage = (message) => {
  const cipher = crypto.createCipher('aes-256-cbc', 'ANJAYBANGETBANG');
  let encryptedMessage = cipher.update(message, 'utf8', 'hex');
  encryptedMessage += cipher.final('hex');
  return encryptedMessage;
}

function decryptMessage(encryptedMessage) {
  const decipher = crypto.createDecipher('aes-256-cbc', 'ANJAYBANGETBANG');
  let decryptedMessage = decipher.update(encryptedMessage, 'hex', 'utf8');
  decryptedMessage += decipher.final('utf8');
  return decryptedMessage;
}

const chatController = {
  create: async (from, to, message) => {
    const encryptedMessage = encryptMessage(message);
    try {
      const created = await Chat.create({ from, to, message: encryptedMessage });
      console.log('Pesan berhasil disimpan');
      return created;
    } catch (error) {
      console.error('Gagal menyimpan pesan');
    }
  },
  findAll: async (req, res) => {
    const { email1, email2 } = req.query;

    try {
      const chatsUser1 = await Chat.findAll({
        where: {
          from: email1,
          to: email2
        },
        order: [['createdAt', 'ASC']]
      });

      const chatsUser2 = await Chat.findAll({
        where: {
          from: email2,
          to: email1
        },
        order: [['createdAt', 'ASC']]
      });

      const decryptedChatsUser1 = chatsUser1.map((chat) => {
        const decryptedMessage = decryptMessage(chat.message);
        return {
          id: chat.id,
          from: chat.from,
          to: chat.to,
          message: decryptedMessage,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          messageFrom: chat.from === email1 ? 'self' : 'other'
        };
      });

      const decryptedChatsUser2 = chatsUser2.map((chat) => {
        const decryptedMessage = decryptMessage(chat.message);
        return {
          id: chat.id,
          from: chat.from,
          to: chat.to,
          message: decryptedMessage,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          messageFrom: chat.from === email2 ? 'self' : 'other'
        };
      });

      const allDecryptedChats = [...decryptedChatsUser1, ...decryptedChatsUser2].sort((a, b) => a.createdAt - b.createdAt);

      res.status(200).json({message: "success", data: allDecryptedChats});
    } catch (error) {
      res.status(500).json({ error: error });
    }
  },
  delMsg: async (req, res) => {
    try {
      const del = await Chat.destroy({ where: { id: req.params.id } });
      if (del) {
        res.status(200).json({ message: 'Udah dihapus masbro, malaikat ngga jadi nyatet' });
      } else {
        res.status(404).json({ message: 'Pesannya emang udah ngga ada masbro' });
      }
    } catch (error) {
      console.error('Error delete Chat:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = chatController;