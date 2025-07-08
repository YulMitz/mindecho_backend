import MentalHealthMetric from '../models/MentalHealthMetric.js';
import User from '../models/User.js';

/*
Responsible for updating and retrieving mental health metrics for users
*/

export const updateMentalHealthMetric = async (req, res) => {
  try {
    const { userID, physical, mood, sleep, energy, appetite } = req.body;

    // Create new user mental health metric data
    const metric = new MentalHealthMetric({
        userId: userID,
        physical: {
          description: physical.description,
          value: physical.value
        },
        mood: {
          description: mood.description,
          value: mood.value
        },
        sleep: {
          description: sleep.description,
          value: sleep.value
        },
        energy: {
          description: energy.description,
          value: energy.value
        },
        appetite: {
          description: appetite.description,
          value: appetite.value
        },
        entryDate: new Date()
    });

    await metric.save();

    res.status(201).json({
      message: 'User mental health metric update successfully',
      user: {
        id: userID,
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getMentalHealthMetric = async (req, res) => {
  try {
    const { userId } = req.body;
    const metrics = await MentalHealthMetric.find({ userId: userId }).sort({ entryDate: -1 });

    if (!metrics || metrics.length === 0) {
      return res.status(404).json({ message: 'No metrics found for this user' });
    }

    res.status(200).json({
      message: 'User mental health metrics retrieved successfully',
      metrics
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default {
  updateMentalHealthMetric,
  getMentalHealthMetric
};