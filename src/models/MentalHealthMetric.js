const mongoose = require('mongoose');

const mentalHealthMetricSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  physical: {
    description: {
      type: String,
      required: true,
      enum: ['awful', 'bad', 'okay', 'good', 'great']
    },
    value: {
      type: Number,
      required: true,
      min: 20,
      max: 100
    }
  },
  mood: {
    description: {
      type: String,
      required: true,
      enum: ['awful', 'bad', 'okay', 'good', 'great']
    },
    value: {
      type: Number,
      required: true,
      min: 20,
      max: 100
    }
  },
  sleep: {
    description: {
      type: String,
      required: true,
      enum: ['awful', 'bad', 'okay', 'good', 'great']
    },
    value: {
      type: Number,
      required: true,
      min: 20,
      max: 100
    }
  },
  energy: {
    description: {
      type: String,
      required: true,
      enum: ['awful', 'bad', 'okay', 'good', 'great']
    },
    value: {
      type: Number,
      required: true,
      min: 20,
      max: 100
    }
  },
  appetite: {
    description: {
      type: String,
      required: true,
      enum: ['awful', 'bad', 'okay', 'good', 'great']
    },
    value: {
      type: Number,
      required: true,
      min: 20,
      max: 100
    }
  },
  entryDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
mentalHealthMetricSchema.index({ userId: 1, entryDate: -1 });

module.exports = mongoose.model('MentalHealthMetric', mentalHealthMetricSchema);