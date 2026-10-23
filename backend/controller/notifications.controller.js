export const SendNotification = async (req, res) => {
  try {
    const { text, data } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user.id;
    const notification = await Notification.create({
      from: senderId,
      to: receiverId,
      text,
      data,
    });

    res.status(201).json(notification);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
