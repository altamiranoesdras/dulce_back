
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');

const index = express();
index.use(cors());
index.use(bodyParser.json());

// Configuración de la conexión a SQL Server usando variables de entorno
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// Conecta a SQL Server y reutiliza la conexión
sql.connect(dbConfig).then((pool) => {
    console.log('Conectado a SQL Server');

    // Ruta de prueba
    index.get('/', (req, res) => {
        res.send('¡Servidor funcionando correctamente con SQL Server!');
    });

    // ---- TIPOS_SERVICIOS ----

    // Obtener todos los tipos de servicios
    index.get('/tipos_servicios', async (req, res) => {
        try {
            const result = await pool.request().query('SELECT * FROM tipos_servicios');
            res.json(result.recordset);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    // Crear un nuevo tipo de servicio
    index.post('/tipos_servicios', async (req, res) => {
        const { descripcion } = req.body;
        try {
            const result = await pool.request()
                .input('descripcion', sql.NVarChar, descripcion)
                .query('INSERT INTO tipos_servicios (descripcion) OUTPUT INSERTED.id VALUES (@descripcion)');
            res.status(201).json(result.recordset[0]);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    // ---- RESERVACIONES ----

    // Obtener todas las reservaciones
    index.get('/reservaciones', async (req, res) => {
        try {
            const result = await pool.request().query('SELECT * FROM reservaciones');
            res.json(result.recordset);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    // Crear una nueva reservación
    index.post('/reservaciones', async (req, res) => {
        const { nombre_cliente, fecha, hora, numero_personas } = req.body;
        try {
            const result = await pool.request()
                .input('nombre_cliente', sql.NVarChar, nombre_cliente)
                .input('fecha', sql.Date, fecha)
                .input('hora', sql.NVarChar, hora)
                .input('numero_personas', sql.Int, numero_personas)
                .query(`INSERT INTO reservaciones (nombre_cliente, fecha, hora, numero_personas) 
                        OUTPUT INSERTED.id VALUES (@nombre_cliente, @fecha, @hora, @numero_personas)`);
            res.status(201).json(result.recordset[0]);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    // ---- SERVICIOS_RESERVACION ----

    // Obtener servicios de una reservación específica
    index.get('/servicios_reservacion/:id_reservacion', async (req, res) => {
        const { id_reservacion } = req.params;
        try {
            const result = await pool.request()
                .input('id_reservacion', sql.Int, id_reservacion)
                .query('SELECT * FROM servicios_reservacion WHERE id_reservacion = @id_reservacion');
            res.json(result.recordset);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    // Asociar un nuevo servicio a una reservación
    index.post('/servicios_reservacion', async (req, res) => {
        const { id_reservacion, id_tipo_servicio, descripcion } = req.body;
        try {
            const result = await pool.request()
                .input('id_reservacion', sql.Int, id_reservacion)
                .input('id_tipo_servicio', sql.Int, id_tipo_servicio)
                .input('descripcion', sql.VarChar, descripcion)
                .query(`INSERT INTO servicios_reservacion (id_reservacion, id_tipo_servicio, descripcion) 
                        OUTPUT INSERTED.id VALUES (@id_reservacion, @id_tipo_servicio, @descripcion)`);
            res.status(201).json(result.recordset[0]);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

}).catch((err) => {
    console.error('Database connection failed: ', err.message);
});

const PORT = process.env.PORT || 3000;
index.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
