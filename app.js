const express = require("express");
const path = require("path");
const { engine } = require("express-handlebars");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Guest = require("./models/Guest");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración del motor de plantillas Handlebars
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views/layouts"),
    partialsDir: path.join(__dirname, "views/partials"),
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // Puedes cambiar esto por tu proveedor de email
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Conexión a MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
  })
  .catch((error) => {
    console.error("❌ Error conectando a MongoDB:", error);
  });

// Rutas
app.get("/", (req, res) => {
  res.render("invitation", {
    title: "XV Años de Mariana",
    name: "Mariana Hurtado Solarte",
    date: "12 de Julio, 2025",
    time: "6:00 PM - 5:00 AM",
    venue: "Salón de Eventos",
    address: "Vía principal que conduce a la vereda Cajete",
    confirmationDate: "8 de Julio",
  });
});

app.post("/confirm", async (req, res) => {
  try {
    const { name, email, phone, guests, song } = req.body;

    // AGREGAR ESTA PARTE - Guardar en la base de datos
    const newGuest = new Guest({
      name: name,
      email: email,
      phone: phone,
      numberOfGuests: parseInt(guests) || 0,
      songRequest: song,
      emailSent: true,
      status: "confirmed",
    });

    // Guardar en MongoDB
    await newGuest.save();

    // Configurar el email de confirmación
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `Confirmación de asistencia - XV Años de Mariana`,
      html: `
                <h2>Nueva confirmación de asistencia</h2>
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono:</strong> ${phone || "No proporcionado"}</p>
                <p><strong>Número de acompañantes:</strong> ${guests}</p>
                <p><strong>Canción solicitada:</strong> ${
                  song || "No especificada"
                }</p>
                <p><strong>Fecha de confirmación:</strong> ${new Date().toLocaleString()}</p>
            `,
    };

    // Enviar email de confirmación al organizador
    await transporter.sendMail(mailOptions);

    // Email de agradecimiento al invitado
    const thankYouEmail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Confirmación recibida - XV Años de Mariana",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #a91033,rgb(230, 15, 15));">
                    <div style="background: white; padding: 30px; border-radius: 15px; text-align: center;">
                        <h1 style="color: #a91033; margin-bottom: 20px;">¡Gracias por confirmar!</h1>
                        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hola ${name},</p>
                        <p style="color: #666; line-height: 1.6;">
                            Hemos recibido tu confirmación para los XV años de Mariana. 
                            ¡Estamos muy emocionados de tenerte con nosotros en esta celebración especial!
                        </p>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #a91033; margin-bottom: 10px;">Detalles del evento:</h3>
                            <p style="margin: 5px 0;"><strong>Fecha:</strong> Sábado, 12 de Julio de 2025</p>
                            <p style="margin: 5px 0;"><strong>Hora:</strong> 8:00 PM - 4:00 AM</p>
                            <p style="margin: 5px 0;"><strong>Lugar:</strong> Vía principal que conduce a la vereda Cajete</p>
                        </div>
                        <p style="color: #666; font-style: italic;">
                            Nos vemos pronto para crear recuerdos inolvidables juntos.
                        </p>
                        <p style="color: #a91033; font-weight: bold; margin-top: 30px;">
                            Con amor,<br>Mariana Hurtado Solarte
                        </p>
                    </div>
                </div>
            `,
    };

    await transporter.sendMail(thankYouEmail);

    res.json({
      success: true,
      message:
        "Confirmación enviada exitosamente. Revisa tu email para más detalles.",
    });
  } catch (error) {
    console.error("Error al enviar confirmación:", error);

    // Manejo específico para errores de duplicado
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Este email ya ha sido registrado anteriormente.",
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Error al enviar la confirmación. Por favor, intenta nuevamente.",
    });
  }
});

// Ruta para ver todos los invitados (panel de administración)
app.get("/admin/invitados", async (req, res) => {
  try {
    const guests = await Guest.find().sort({ confirmationDate: -1 });
    const totalGuests = guests.length;
    const totalPeople = guests.reduce(
      (sum, guest) => sum + guest.totalPeople,
      0
    );
    const totalSongRequests = guests.filter(
      (guest) => guest.songRequest
    ).length;

    res.render("admin", {
      title: "Panel de Administración - XV Años de Mariana",
      guests,
      stats: {
        totalGuests,
        totalPeople,
        totalSongRequests,
        averageGuestsPerInvitation:
          totalGuests > 0 ? (totalPeople / totalGuests).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error("Error al obtener invitados:", error);
    res.status(500).render("error", {
      title: "Error",
      message: "Error al cargar los datos de invitados",
    });
  }
});

// Ruta para obtener estadísticas en JSON
app.get("/api/stats", async (req, res) => {
  try {
    const totalGuests = await Guest.countDocuments();
    const guests = await Guest.find();
    const totalPeople = guests.reduce(
      (sum, guest) => sum + guest.totalPeople,
      0
    );
    const guestsWithSongs = await Guest.countDocuments({
      songRequest: { $ne: null, $ne: "" },
    });

    res.json({
      totalGuests,
      totalPeople,
      guestsWithSongs,
      averageGuestsPerInvitation:
        totalGuests > 0 ? (totalPeople / totalGuests).toFixed(1) : 0,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// Ruta para eliminar un invitado
app.delete("/admin/invitados/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedGuest = await Guest.findByIdAndDelete(id);

    if (!deletedGuest) {
      return res.status(404).json({
        success: false,
        message: "Invitado no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Invitado eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar invitado:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar invitado",
    });
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).render("404", { title: "Página no encontrada" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
