# Guía de exposición — Novaimport

## Idea principal

Novaimport es una aplicación de comercio electrónico organizada como una
**arquitectura distribuida basada en servicios, con estilo de microservicios**.
Tiene una API Gateway y seis servicios de negocio desplegados en contenedores.
La principal limitación arquitectónica es que los servicios comparten una
única base de datos MySQL, por lo que todavía no son microservicios plenamente
autónomos.

## Explicación breve para presentar

> Novaimport es una tienda de tecnología. La aplicación está dividida por
> responsabilidades en seis servicios: productos, pedidos, PQR, garantías,
> autenticación y clientes. El usuario entra por una API Gateway, que sirve el
> sitio y dirige cada solicitud al servicio correspondiente. Los servicios se
> ejecutan en contenedores Docker y se comunican por HTTP dentro de la red
> interna. Actualmente comparten una base de datos MySQL, lo que simplifica la
> operación, pero genera acoplamiento; por eso describimos la solución como
> arquitectura distribuida con estilo de microservicios y base de datos
> compartida.

## Componentes y recorrido de una solicitud

```text
Navegador
   |
   v
Caddy (HTTPS) -> API Gateway (frontend y proxy)
                     |       |        |       |        |       |
                 Productos Pedidos   PQR   Garantías   Auth  Clientes
                     \       |        |       |        |       /
                         MySQL compartido
```

- **Productos:** consulta y administración del catálogo.
- **Pedidos:** registra pedidos y actualiza inventario.
- **PQR y garantías:** gestionan solicitudes de los clientes.
- **Autenticación y clientes:** atienden acceso y operaciones de clientes.
- **Gateway:** conserva un punto de entrada para el frontend y las rutas
  `/api/...`; los puertos de los servicios no se publican al exterior.
- **Datos y archivos:** MySQL es compartido; imágenes y adjuntos se almacenan
  en volúmenes Docker compartidos.
- **Despliegue:** Docker Compose ejecuta la gateway, los seis servicios y Caddy.
  Los contenedores de la aplicación usan la misma imagen, pero ejecutan
  procesos/roles distintos.

## Demostración recomendada

1. Antes de exponer, confirma que Docker Desktop esté iniciado y ejecuta:

   ```powershell
   docker compose ps
   ```

   Los servicios de aplicación deben aparecer como `healthy`.
2. Abre **http://localhost:3000**. Para esta demostración local se recomienda
   HTTP: el certificado HTTPS local puede producir una advertencia del
   navegador.
3. Muestra el catálogo: la validación actual encontró **27 productos** y las
   imágenes cargadas.
4. Explica que el navegador llama a la gateway, que enruta las solicitudes API
   a los servicios en la red Docker.
5. Si muestras el panel administrativo, usa una cuenta de demostración
   autorizada. Evita mostrar credenciales, datos personales o información real.
6. No crees pedidos durante la exposición si estás conectado a inventario real:
   la operación puede modificar cantidades y registros.

La URL de salud que se validó es **http://localhost:3000/health**. No compartas
el archivo `.env`, contraseñas ni secretos durante la presentación.

## Preguntas que podrían hacer

**¿Es monolítica o de microservicios?**  
Está dividida en servicios que se ejecutan por separado, así que no es un
monolito tradicional. Es razonable llamarla arquitectura distribuida con estilo
de microservicios. Sin embargo, la base compartida y los archivos/sesiones
compartidos limitan la autonomía de los servicios.

**¿Por qué todos usan la misma base de datos?**  
Es una decisión pragmática para el alcance actual: reduce la complejidad
operativa. El costo es que los servicios quedan acoplados al esquema y a la
disponibilidad de la base. Separar las bases sería una posible evolución, no un
requisito para que el proyecto funcione o para presentarlo.

**¿Qué ocurre al crear un pedido?**  
El servicio de pedidos valida y actualiza el inventario dentro de una
transacción. La transacción ayuda a mantener consistentes el pedido, sus
detalles y las existencias.

**¿Está desplegado en Azure?**  
No. La demostración actual corre localmente con Docker Compose; no se han creado
recursos ni se ha desplegado en Azure.

## Estado comprobado antes de la exposición

- Docker Compose: configuración válida; los servicios de aplicación aparecen
  saludables.
- Pruebas automatizadas: **4 de 4 pasaron** con `npm test`.
- Gateway: página principal y `/health` responden con HTTP 200.
- Catálogo: 27 productos devueltos; en navegador se observaron 27 tarjetas y la
  primera imagen cargada.

## Alcance

El proyecto no incluye la función de préstamos/QR. Sus archivos, prueba y
migración se retiraron para mantener el alcance centrado en Novaimport.
