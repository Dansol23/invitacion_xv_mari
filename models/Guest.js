const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    numberOfGuests: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    songRequest: {
        type: String,
        trim: true
    },
    confirmationDate: {
        type: Date,
        default: Date.now
    },
    emailSent: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['confirmed', 'pending', 'cancelled'],
        default: 'confirmed'
    }
}, {
    timestamps: true
});

// Índice para evitar duplicados por email
guestSchema.index({ email: 1 }, { unique: true });

// Método para obtener el número total de personas (invitado + acompañantes)
guestSchema.virtual('totalPeople').get(function() {
    return this.numberOfGuests + 1; // +1 por el invitado principal
});

// Método para formatear la fecha de confirmación
guestSchema.methods.getFormattedDate = function() {
    return this.confirmationDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

module.exports = mongoose.model('Guest', guestSchema);