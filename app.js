const express = require("express");
const path = require("path");
const { engine } = require("express-handlebars");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Guest = require("./models/Guest");
require("dotenv").config();
const cron = require('node-cron');


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
    venue: "Finca Villa Jordan",
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
                            <p style="margin: 5px 0;"><strong>Hora:</strong> 6:00 PM - 5:00 AM</p>
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

app.get("/admin/canciones", async (req, res) => {
  try {
    // Buscar solo los documentos donde songRequest no sea null ni una cadena vacía
    const canciones = await Guest.find(
      { songRequest: { $ne: null, $ne: "" } },
      "songRequest"
    );

    const totalSongs = canciones.length;

    res.render("canciones", {
      title: "Listado de canciones",
      canciones,
      songs: {
        totalSongs,
      },
    });
  } catch (error) {
    console.error("Error al obtener canciones:", error);
    res.status(500).render("error", {
      title: "Error",
      message: "Error al cargar las canciones",
    });
  }
});

// Ruta para ver todos los invitados (panel de administración)
app.get("/admin/invitados", async (req, res) => {
  try {
    const guests = await Guest.find().sort({ confirmationDate: -1 });
    
    // Formatear las fechas
    const formattedGuests = guests.map(guest => ({
      ...guest.toObject(),
      formattedConfirmationDate: guest.confirmationDate 
        ? new Date(guest.confirmationDate).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Sin confirmar'
    }));

    const totalGuests = guests.length;
    const totalPeople = guests.reduce((sum, guest) => sum + guest.totalPeople, 0);
    const totalSongRequests = guests.filter((guest) => guest.songRequest).length;

    res.render("admin", {
      title: "Panel de Administración - XV Años de Mariana",
      guests: formattedGuests,
      stats: {
        totalGuests,
        totalPeople,
        totalSongRequests,
        averageGuestsPerInvitation: totalGuests > 0 ? (totalPeople / totalGuests).toFixed(1) : 0,
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


// Función para enviar recordatorios masivos
async function sendMassReminders() {
  const today = new Date();
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  
  console.log(`🕐 Iniciando proceso de recordatorios - ${today.toLocaleString('es-ES')}`);
  
  try {
    // SEGURIDAD: Verificar que sea exactamente 12 de julio 2025, 10:00 AM
    const targetDate = new Date('2025-07-12T10:00:00');
    const currentDate = new Date();
    
    // Verificación de fecha y hora exacta (con margen de 5 minutos)
    const timeDifference = Math.abs(currentDate - targetDate);
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    if (timeDifference > fiveMinutesInMs) {
      console.log(`⚠️  No es el momento correcto para enviar recordatorios. Fecha/hora actual: ${currentDate.toLocaleString('es-ES')}`);
      return;
    }
    
    // Obtener todos los invitados confirmados con email válido
    const guests = await Guest.find({
      status: 'confirmed',
      email: { $ne: null, $ne: '' }
    });
    
    if (guests.length === 0) {
      console.log('📧 No hay invitados para enviar recordatorios o ya se enviaron todos');
      return;
    }
    
    console.log(`📊 Preparando envío para ${guests.length} invitados`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Enviar recordatorios uno por uno con delay para evitar límites
    for (const guest of guests) {
      try {
        // Plantilla del recordatorio
        const reminderEmail = {
          from: process.env.EMAIL_USER,
          to: guest.email,
          subject: '🎉 ¡Recordatorio! XV Años de Mariana - HOY es el día',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #a91033, rgb(230, 15, 15));">
              <div style="background: white; padding: 30px; border-radius: 15px; text-align: center;">
                <h1 style="color: #a91033; margin-bottom: 20px;">🎉 ¡HOY es el gran día!</h1>
                <p style="font-size: 18px; color: #333; margin-bottom: 20px;">¡Hola ${guest.name}!</p>
                <p style="color: #666; line-height: 1.6; font-size: 16px;">
                  Te recordamos que <strong>HOY</strong> es la celebración de los XV años de Mariana.
                  ¡Estamos muy emocionados de tenerte con nosotros!
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #a91033;">
                  <h3 style="color: #a91033; margin-bottom: 15px;">📅 Detalles del evento - HOY:</h3>
                  <p style="margin: 8px 0; font-size: 16px;"><strong>🕰️ Hora:</strong> 6:00 PM - 5:00 AM</p>
                  <p style="margin: 8px 0; font-size: 16px;"><strong>📍 Lugar:</strong> Vía principal que conduce a la vereda Cajete</p>
                  <p style="margin: 8px 0; font-size: 16px;"><strong>👥 Personas confirmadas:</strong> ${guest.numberOfGuests + 1}</p>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #ffeaa7;">
                  <p style="color: #856404; margin: 0; font-weight: bold;">
                    🚗 Recuerda llegar con tiempo y traer tu mejor sonrisa
                  </p>
                </div>
                
                ${guest.songRequest ? `
                  <div style="background: #e8f4f8; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <p style="color: #0c5460; margin: 0;">
                      🎵 <strong>Tu canción solicitada:</strong> "${guest.songRequest}"
                    </p>
                  </div>
                ` : ''}
                
                <p style="color: #666; font-style: italic; margin-top: 25px;">
                  ¡Nos vemos en unas horas para crear recuerdos inolvidables juntos!
                </p>
                
                <p style="color: #a91033; font-weight: bold; margin-top: 30px; font-size: 18px;">
                  Con mucho amor,<br>
                  💕 Mariana Hurtado Solarte
                </p>
              </div>
            </div>
          `
        };
        
        // Enviar email
        await transporter.sendMail(reminderEmail);
        
        successCount++;
        console.log(`✅ Recordatorio enviado a: ${guest.email}`);
        
        // Delay de 2 segundos entre envíos para evitar límites de Gmail
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (emailError) {
        errorCount++;
        console.error(`❌ Error enviando a ${guest.email}:`, emailError.message);
      }
    }
    
    console.log(`📈 Resumen del envío:`);
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📧 Total procesados: ${guests.length}`);
    
    // Enviar reporte al administrador
    if (successCount > 0 || errorCount > 0) {
      const adminReport = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: '📊 Reporte de Recordatorios - XV Años de Mariana',
        html: `
          <h2>📊 Reporte de Recordatorios Enviados</h2>
          <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-ES')}</p>
          <p><strong>✅ Recordatorios enviados exitosamente:</strong> ${successCount}</p>
          <p><strong>❌ Errores en el envío:</strong> ${errorCount}</p>
          <p><strong>📧 Total de invitados procesados:</strong> ${guests.length}</p>
          <hr>
          <p><em>Sistema de recordatorios automático - XV Años de Mariana</em></p>
        `
      };
      
      await transporter.sendMail(adminReport);
    }
    
  } catch (error) {
    console.error('💥 Error crítico en el sistema de recordatorios:', error);
    
    // Enviar alerta al administrador
    try {
      const errorAlert = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: '🚨 ERROR en Sistema de Recordatorios',
        html: `
          <h2>🚨 Error en el Sistema de Recordatorios</h2>
          <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-ES')}</p>
          <p><strong>Error:</strong> ${error.message}</p>
          <p><strong>Stack:</strong> <pre>${error.stack}</pre></p>
          <hr>
          <p><em>Revisa el sistema inmediatamente</em></p>
        `
      };
      
      await transporter.sendMail(errorAlert);
    } catch (emailError) {
      console.error('Error enviando alerta de error:', emailError);
    }
  }
}

// PROGRAMACIÓN SEGURA: Solo se ejecuta el 12 de julio de 2025 a las 10:00 AM
// Verifica CADA MINUTO si es el momento exacto
cron.schedule('* 10 12 7 *', async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // TRIPLE VERIFICACIÓN de seguridad
  if (year === 2025 && month === 7 && day === 12 && hour === 10 && minute === 0) {
    console.log('🎯 HORA EXACTA DETECTADA: Iniciando envío de recordatorios');
    await sendMassReminders();
  }
}, {
  scheduled: true,
  timezone: "America/Bogota" // Zona horaria de Colombia
});

// Ruta manual de emergencia (solo para pruebas o envío manual)
app.post('/admin/send-reminders-manual', async (req, res) => {
  try {
    // Solo permitir si se proporciona una clave secreta
    const { secretKey } = req.body;
    if (secretKey !== process.env.REMINDER_SECRET_KEY) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    
    await sendMassReminders();
    res.json({ success: true, message: 'Recordatorios enviados manualmente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error enviando recordatorios' });
  }
});

// Ruta para mostrar la vista de prueba
app.get('/admin/test-reminders', (req, res) => {
  res.render('test-reminders', {
    title: 'Prueba de Recordatorios - XV Años de Mariana'
  });
});

// Ruta para enviar email de prueba individual
app.post('/admin/test-reminder-email', async (req, res) => {
  try {
    const { testEmail, secretKey } = req.body;
    
    // Verificar clave secreta
    if (secretKey !== process.env.REMINDER_SECRET_KEY) {
      return res.status(401).json({ success: false, message: 'Clave secreta incorrecta' });
    }
    
    if (!testEmail) {
      return res.status(400).json({ success: false, message: 'Email es requerido' });
    }
    const guest = await Guest.find({
      status: 'confirmed',
      email: { $ne: null, $ne: '' }
    });
    
    // Plantilla del email de prueba
    const testReminderEmail = {
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: '🧪 [PRUEBA] Recordatorio XV Años de Mariana',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #a91033, rgb(230, 15, 15));">
          <div style="background: white; padding: 30px; border-radius: 15px; text-align: center;">
            <div style="background: #fff3cd; padding: 10px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeaa7;">
              <p style="color: #856404; margin: 0; font-weight: bold;">
                🧪 ESTO ES UNA PRUEBA - NO ES EL DÍA DEL EVENTO
              </p>
            </div>
            
            <h1 style="color: #a91033; margin-bottom: 20px;">🎉 ¡HOY es el gran día!</h1>
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">¡Hola ${guest.name}!</p>
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Te recordamos que <strong>HOY</strong> es la celebración de los XV años de Mariana.
              ¡Estamos muy emocionados de tenerte con nosotros!
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #a91033;">
              <h3 style="color: #a91033; margin-bottom: 15px;">📅 Detalles del evento - HOY:</h3>
              <p style="margin: 8px 0; font-size: 16px;"><strong>🕰️ Hora:</strong> 6:00 PM - 5:00 AM</p>
              <p style="margin: 8px 0; font-size: 16px;"><strong>📍 Lugar:</strong> Vía principal que conduce a la vereda Cajete</p>
              <p style="margin: 8px 0; font-size: 16px;"><strong>👥 Personas confirmadas:</strong> ${guest.numberOfGuests + 1}</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #ffeaa7;">
              <p style="color: #856404; margin: 0; font-weight: bold;">
                🚗 Recuerda llegar con tiempo y traer tu mejor sonrisa
              </p>
            </div>
            
            ${guest.songRequest ? `
                  <div style="background: #e8f4f8; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <p style="color: #0c5460; margin: 0;">
                      🎵 <strong>Tu canción solicitada:</strong> "${guest.songRequest}"
                    </p>
                  </div>
                ` : ''}
            
            <p style="color: #666; font-style: italic; margin-top: 25px;">
              ¡Nos vemos en unas horas para crear recuerdos inolvidables juntos!
            </p>
            
            <p style="color: #a91033; font-weight: bold; margin-top: 30px; font-size: 18px;">
              Con mucho amor,<br>
              💕 Mariana Hurtado Solarte
            </p>
            
            <div style="background: #f8d7da; padding: 10px; border-radius: 8px; margin-top: 20px; border: 1px solid #f5c6cb;">
              <p style="color: #721c24; margin: 0; font-size: 14px;">
                🧪 <strong>RECORDATORIO:</strong> Este es un email de prueba. El evento real es el 12 de Julio de 2025.
              </p>
            </div>
          </div>
        </div>
      `
    };
    
    // Enviar email de prueba
    await transporter.sendMail(testReminderEmail);
    
    res.json({ 
      success: true, 
      message: `Email de prueba enviado exitosamente a ${testEmail}` 
    });
    
  } catch (error) {
    console.error('Error enviando email de prueba:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error enviando email de prueba: ' + error.message 
    });
  }
});

console.log('🔔 Sistema de recordatorios programado iniciado');
console.log('📅 Recordatorios programados para: 12 de Julio 2025, 10:00 AM (Zona horaria: America/Bogota)');

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).render("404", { title: "Página no encontrada" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
