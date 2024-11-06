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

    // ---- RESERVACIONES ----

    // Crear una nueva reservación
    index.post('/reservaciones', async (req, res) => {
        const { nombre_cliente, fecha, hora, numero_personas } = req.body;

        try {
            const result = await pool.request()
                .input('nombre_cliente', sql.NVarChar, nombre_cliente)
                .input('fecha', sql.Date, fecha)
                .input('hora', sql.NVarChar, hora)
                .input('numero_personas', sql.Int, numero_personas)
                .query('INSERT INTO reservaciones (nombre_cliente, fecha, hora, numero_personas) OUTPUT INSERTED.id VALUES (@nombre_cliente, @fecha, @hora, @numero_personas)');
            res.status(201).json(result.recordset[0]);
        } catch (err) {
            console.error('Error al crear la reservación:', err);
            res.status(500).json({ message: 'Error al crear la reservación', error: err.message });
        }
    });

    // Obtener todas las reservaciones o una sola reservación si se proporciona un id
    index.get('/reservaciones/:id?', async (req, res) => {
        const { id } = req.params;
        try {
            let result;
            if (id) {
                result = await pool.request()
                    .input('id', sql.Int, id)
                    .query('SELECT * FROM reservaciones WHERE id = @id');
                if (result.recordset.length === 0) {
                    return res.status(404).send('Reservación no encontrada');
                }
            } else {
                result = await pool.request().query('SELECT * FROM reservaciones');
            }
            res.json(result.recordset);
        } catch (err) {
            console.error('Error al obtener las reservaciones:', err);
            res.status(500).send('Error al obtener las reservaciones');
        }
    });

    // Actualizar una reservación
    index.put('/reservaciones/:id', async (req, res) => {
        const { id } = req.params;
        const { nombre_cliente, fecha, hora, numero_personas } = req.body;
        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .input('nombre_cliente', sql.NVarChar, nombre_cliente)
                .input('fecha', sql.Date, fecha)
                .input('hora', sql.NVarChar, hora)
                .input('numero_personas', sql.Int, numero_personas)
                .query('UPDATE reservaciones SET nombre_cliente = @nombre_cliente, fecha = @fecha, hora = @hora, numero_personas = @numero_personas WHERE id = @id');
            res.sendStatus(204);
        } catch (err) {
            console.error('Error al actualizar la reservación:', err);
            res.status(500).send('Error al actualizar la reservación');
        }
    });

    // Eliminar una reservación
    index.delete('/reservaciones/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM reservaciones WHERE id = @id');
            if (result.rowsAffected[0] > 0) {
                res.status(200).json({ message: 'Reservación eliminada correctamente' });
            } else {
                res.status(404).json({ message: 'Reservación no encontrada o ya eliminada' });
            }
        } catch (err) {
            console.error('Error al eliminar la reservación:', err);
            res.status(500).json({ message: 'Error al eliminar la reservación' });
        }
    });


    // ---- SERVICIOS DE RESERVACIÓN ----

    // Asociar un nuevo servicio a una reservación
    index.post('/servicios_reservacion', async (req, res) => {
        const { id_reservacion, id_tipo_servicio, descripcion } = req.body;


        try {
            const result = await pool.request()
                .input('id_reservacion', sql.Int, id_reservacion)
                .input('id_tipo_servicio', sql.Int, id_tipo_servicio)
                .input('descripcion', sql.VarChar(100), descripcion)
                .query('INSERT INTO servicios_reservacion (id_reservacion, id_tipo_servicio, descripcion) OUTPUT INSERTED.id VALUES (@id_reservacion, @id_tipo_servicio, @descripcion)');
            res.status(201).json(result.recordset[0]);
        } catch (err) {
            console.error('Error al asociar el servicio a la reservación:', err);
            res.status(500).json({ message: 'Error al asociar el servicio', error: err.message });
        }
    });

    // Obtener servicios de una reservación específica
    index.get('/servicios_reservacion/:id_reservacion', async (req, res) => {
        const { id_reservacion } = req.params;
        try {
            const result = await pool.request()
                .input('id_reservacion', sql.Int, id_reservacion)
                .query(`
                SELECT 
                    sr.id,
                    sr.descripcion,
                    ts.descripcion AS tipo_servicio_descripcion
                FROM 
                    servicios_reservacion AS sr
                JOIN 
                    tipos_servicios AS ts ON sr.id_tipo_servicio = ts.id
                WHERE 
                    sr.id_reservacion = @id_reservacion
            `);
            res.json(result.recordset);
        } catch (err) {
            console.error('Error al obtener los servicios de la reservación:', err);
            res.status(500).send('Error al obtener los servicios de la reservación');
        }
    });

    // Eliminar un servicio de una reservación específica
    index.delete('/servicios_reservacion/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM servicios_reservacion WHERE id = @id');

            // Verificar si se eliminó algún registro
            if (result.rowsAffected[0] > 0) {
                res.status(200).json({ message: 'Servicio de reservación eliminado correctamente' });
            } else {
                res.status(404).json({ message: 'Servicio de reservación no encontrado o ya eliminado' });
            }
        } catch (err) {
            console.error('Error al eliminar el servicio de la reservación:', err);
            res.status(500).send('Error al eliminar el servicio de la reservación');
        }
    });


    // ---- TIPOS DE SERVICIOS ----

    // Crear un nuevo tipo de servicio
    index.post('/tipos_servicios', async (req, res) => {
        const { descripcion } = req.body;
        try {
            const result = await pool.request()
                .input('descripcion', sql.NVarChar(255), descripcion)
                .query('INSERT INTO tipos_servicios (descripcion) OUTPUT INSERTED.id VALUES (@descripcion)');
            res.status(201).json(result.recordset[0]);
        } catch (err) {
            console.error('Error al crear el tipo de servicio:', err);
            res.status(500).json({ message: 'Error al crear el tipo de servicio', error: err.message });
        }
    });

    // Obtener todos los tipos de servicios
    index.get('/tipos_servicios', async (req, res) => {
        try {
            const result = await pool.request().query('SELECT * FROM tipos_servicios');
            res.json(result.recordset);
        } catch (err) {
            console.error('Error al obtener los tipos de servicios:', err);
            res.status(500).send('Error al obtener los tipos de servicios');
        }
    });

    // Actualizar un tipo de servicio
    index.put('/tipos_servicios/:id', async (req, res) => {
        const { id } = req.params;
        const { descripcion } = req.body;
        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .input('descripcion', sql.NVarChar(255), descripcion)
                .query('UPDATE tipos_servicios SET descripcion = @descripcion WHERE id = @id');
            res.status(204).json({ message: 'Tipo de servicio actualizado exitosamente' });
        } catch (err) {
            console.error('Error al actualizar el tipo de servicio:', err);
            res.status(500).send('Error al actualizar el tipo de servicio');
        }
    });

    // Eliminar un tipo de servicio
    index.delete('/tipos_servicios/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM tipos_servicios WHERE id = @id');
            res.sendStatus(204);
        } catch (err) {
            console.error('Error al eliminar el tipo de servicio:', err);
            res.status(500).send('Error al eliminar el tipo de servicio');
        }
    });

    // Configura el servidor para escuchar en un puerto específico
    const PORT = process.env.PORT || 3001;
    index.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Error al conectar a SQL Server:', err);
});
