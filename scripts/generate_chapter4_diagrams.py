from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "output" / "diagramas_capitulo4"
SRC = BASE / "fuentes_plantuml"
IMG = BASE / "imagenes"
JAVA = Path(r"C:\Program Files (x86)\Common Files\Oracle\Java\java8path\java.exe")
JAR = Path(
    r"C:\Users\Power\Documents\Proyecto-Empresa\Innova-Cochera-Project"
    r"\cochera-innova\tmp\plantuml\plantuml-1.2024.8.jar"
)


COMMON = r"""
skinparam backgroundColor white
skinparam shadowing false
skinparam handwritten false
skinparam defaultFontName Arial
skinparam defaultFontSize 16
skinparam ArrowColor #334155
skinparam ArrowThickness 1.4
skinparam packageStyle rectangle
skinparam roundcorner 10
skinparam dpi 180
skinparam linetype ortho
skinparam usecase {
  BackgroundColor #EFF6FF
  BorderColor #2563EB
  FontColor #172554
}
skinparam actor {
  BorderColor #334155
  FontColor #0F172A
}
skinparam class {
  BackgroundColor #F8FAFC
  BorderColor #475569
  HeaderBackgroundColor #DBEAFE
  FontColor #0F172A
}
skinparam activity {
  BackgroundColor #EFF6FF
  BorderColor #2563EB
  DiamondBackgroundColor #FEF3C7
  DiamondBorderColor #D97706
  StartColor #1E293B
  EndColor #1E293B
}
skinparam component {
  BackgroundColor #F8FAFC
  BorderColor #475569
  FontColor #0F172A
}
skinparam database {
  BackgroundColor #ECFDF5
  BorderColor #059669
}
skinparam node {
  BackgroundColor #F8FAFC
  BorderColor #475569
}
skinparam rectangle {
  BackgroundColor #F8FAFC
  BorderColor #475569
}
"""


def diagram(body: str) -> str:
    normalized: list[str] = []
    for line in body.strip().splitlines():
        stripped = line.strip()
        if (
            stripped.startswith(("class ", "interface "))
            and "{" in line
            and "}" in line
        ):
            before, remainder = line.split("{", 1)
            fields, after = remainder.rsplit("}", 1)
            indent = line[: len(line) - len(line.lstrip())]
            normalized.append(before.rstrip() + " {")
            normalized.extend(
                indent + "  " + field.strip()
                for field in fields.strip().replace(";", "\\n").split("\\n")
                if field.strip()
            )
            normalized.append(indent + "}" + after)
        else:
            normalized.append(line)
    return "@startuml\n" + COMMON + "\n" + "\n".join(normalized) + "\n@enduml\n"


DIAGRAMS: dict[str, str] = {
    "01_casos_uso_analisis": diagram(r"""
left to right direction
title Diagrama de Casos de Uso - Análisis
actor Propietario
actor Operador
actor Cliente
actor Proveedor
actor "Cámara IP" as Camara
rectangle "Innova Store" {
  usecase "Autenticarse" as UC1
  usecase "Administrar usuarios\ny permisos" as UC2
  usecase "Gestionar productos\ne inventario" as UC3
  usecase "Registrar compra" as UC4
  usecase "Registrar comprobante\ndel proveedor" as UC5
  usecase "Controlar percepciones\ny límites de compra" as UC6
  usecase "Registrar venta" as UC7
  usecase "Generar ticket interno" as UC8
  usecase "Gestionar caja" as UC9
  usecase "Gestionar fiados\ny abonos" as UC10
  usecase "Gestionar clientes\ny promociones" as UC11
  usecase "Consultar reportes" as UC12
  usecase "Supervisar cámaras\ny alertas" as UC13
}
Propietario --> UC1
Propietario --> UC2
Propietario --> UC3
Propietario --> UC4
Propietario --> UC6
Propietario --> UC9
Propietario --> UC11
Propietario --> UC12
Propietario --> UC13
Operador --> UC1
Operador --> UC4
Operador --> UC7
Operador --> UC9
Operador --> UC10
Cliente --> UC7
Cliente --> UC10
Proveedor --> UC4
Proveedor --> UC5
Camara --> UC13
UC4 .> UC5 : <<include>>
UC4 .> UC6 : <<include>>
UC7 .> UC8 : <<include>>
UC10 .> UC7 : <<extend>>
"""),

    "02_clases_analisis": diagram(r"""
title Diagrama de Clases - Análisis
hide methods
class Usuario { idUsuario\ncorreo\ncontraseña\nestado }
class Rol { idRol\nnombre }
class Sucursal { idSucursal\nnombre\ndirección }
class Producto { idProducto\nnombre\ncódigoBarras }
class Inventario { idInventario\nstock\nstockMínimo }
class Proveedor { idProveedor\nnombre\nnúmeroDocumento }
class Compra { idCompra\nfecha\nsubtotal\nIGV\ntotal }
class Comprobante { idComprobante\nserie\nnúmero\nfechaEmisión }
class Percepcion { idPercepción\nbaseCálculo\nporcentaje\nmonto }
class Cliente { idCliente\nnombre\nnúmeroDocumento }
class Venta { idVenta\nfecha\ntotal }
class TicketInterno { código\nfecha\ntotal }
class DeudaCliente { idDeuda\nsaldo\nfechaVencimiento }
class Caja { idCaja\nfechaApertura\nmontoApertura\nmontoCierre }
class MovimientoInventario { idMovimiento\ntipo\ncantidad\nfecha }
Usuario "*" -- "1" Rol
Usuario "*" -- "*" Sucursal
Sucursal "1" -- "*" Inventario
Producto "1" -- "*" Inventario
Proveedor "1" -- "*" Compra
Compra "1" -- "1..*" Comprobante
Compra "1" -- "0..1" Percepcion
Compra "1" -- "*" MovimientoInventario
Cliente "0..1" -- "*" Venta
Venta "1" -- "1" TicketInterno
Venta "1" -- "0..1" DeudaCliente
Venta "*" -- "1" Caja
Venta "1" -- "*" MovimientoInventario
"""),

    "03_actividades_analisis": diagram(r"""
title Diagrama de Actividades - Análisis
|Propietario u operador|
start
:Iniciar sesión;
|Sistema|
:Validar credenciales y permisos;
if (¿Operación seleccionada?) then (Compra)
  |Propietario u operador|
  :Registrar proveedor, comprobante\ny productos recibidos;
  |Sistema|
  :Validar datos de compra;
  :Calcular percepción registrada\ny acumulado mensual;
  :Actualizar inventario y egreso;
elseif (Venta)
  |Propietario u operador|
  :Seleccionar productos y cliente;
  |Sistema|
  :Calcular total y verificar stock;
  if (¿Venta al crédito?) then (Sí)
    :Crear deuda del cliente;
  else (No)
    :Registrar pago en caja;
  endif
  :Descontar inventario;
  :Generar ticket interno;
else (Consulta)
  |Propietario u operador|
  :Solicitar reporte o tablero;
  |Sistema|
  :Consolidar compras, ventas, caja,\nfiados e inventario;
endif
:Actualizar panel mediante Socket.IO;
|Propietario u operador|
:Revisar resultado;
stop
"""),

    "04_entidad_relacion_logico": diagram(r"""
title Modelo Entidad-Relación Lógico
hide methods
hide stereotypes
class PROVEEDOR <<Entidad>> { id_proveedor : PK\nnombre\nnumero_documento }
class COMPRA <<Entidad>> { id_compra : PK\nid_proveedor : FK\nfecha_compra\ntotal }
class COMPROBANTE <<Entidad>> { id_comprobante : PK\nid_compra : FK\nserie\nnumero }
class PERCEPCION <<Entidad>> { id_percepcion : PK\nid_compra : FK\nporcentaje\nmonto }
class PRODUCTO <<Entidad>> { id_producto : PK\nnombre\ncodigo_barras }
class COMPRA_DETALLE <<Entidad>> { id_detalle : PK\nid_compra : FK\nid_producto_sucursal : FK\ncantidad\nprecio_unitario }
class INVENTARIO <<Entidad>> { id_inventario : PK\nid_producto_sucursal : FK\nstock }
class VENTA <<Entidad>> { id_venta : PK\nid_cliente : FK\nid_caja : FK\ntotal }
class CLIENTE <<Entidad>> { id_cliente : PK\nnombre\nnumero_documento }
class DEUDA <<Entidad>> { id_deuda : PK\nid_cliente : FK\nid_venta : FK\nsaldo }
class ABONO <<Entidad>> { id_abono : PK\nid_deuda : FK\nmonto\nfecha }
class CAJA <<Entidad>> { id_caja : PK\nfecha_apertura\nmonto_apertura }
PROVEEDOR ||--o{ COMPRA
COMPRA ||--|{ COMPROBANTE
COMPRA ||--o| PERCEPCION
COMPRA ||--|{ COMPRA_DETALLE
PRODUCTO ||--o{ COMPRA_DETALLE
PRODUCTO ||--o{ INVENTARIO
CLIENTE ||--o{ VENTA
CAJA ||--o{ VENTA
VENTA ||--o| DEUDA
DEUDA ||--o{ ABONO
"""),

    "05_casos_uso_general_diseno": diagram(r"""
left to right direction
title Diagrama de Casos de Uso General - Diseño
actor "Propietario / Administrador" as Admin
actor Operador
actor Cliente
actor Proveedor
actor "Cámara IP" as Camara
rectangle "Innova Store" {
  package "Seguridad" {
    usecase "Iniciar sesión"
    usecase "Gestionar usuarios, roles y permisos"
  }
  package "Logística" {
    usecase "Gestionar productos y catálogos"
    usecase "Consultar inventario y kardex"
  }
  package "Compras" {
    usecase "Registrar compra y comprobantes"
    usecase "Registrar y controlar percepciones"
  }
  package "Ventas" {
    usecase "Registrar venta"
    usecase "Emitir ticket interno"
    usecase "Gestionar caja y pagos"
  }
  package "Clientes" {
    usecase "Gestionar fiados y abonos"
    usecase "Gestionar clientes y promociones"
  }
  package "Control" {
    usecase "Generar reportes PDF y Excel"
    usecase "Visualizar cámaras y alertas IA"
  }
}
Admin --> "Iniciar sesión"
Admin --> "Gestionar usuarios, roles y permisos"
Admin --> "Gestionar productos y catálogos"
Admin --> "Consultar inventario y kardex"
Admin --> "Registrar compra y comprobantes"
Admin --> "Registrar y controlar percepciones"
Admin --> "Gestionar caja y pagos"
Admin --> "Gestionar clientes y promociones"
Admin --> "Generar reportes PDF y Excel"
Admin --> "Visualizar cámaras y alertas IA"
Operador --> "Iniciar sesión"
Operador --> "Registrar venta"
Operador --> "Emitir ticket interno"
Operador --> "Gestionar caja y pagos"
Operador --> "Gestionar fiados y abonos"
Proveedor --> "Registrar compra y comprobantes"
Cliente --> "Registrar venta"
Cliente --> "Gestionar fiados y abonos"
Camara --> "Visualizar cámaras y alertas IA"
"""),

    "06_casos_uso_autenticacion": diagram(r"""
left to right direction
title Casos de Uso - Autenticación y Sesión
actor Usuario
actor Administrador
rectangle "Módulo de autenticación" {
  usecase "Iniciar sesión" as A1
  usecase "Validar credenciales" as A2
  usecase "Obtener perfil, rol\ny permisos" as A3
  usecase "Renovar sesión" as A4
  usecase "Cambiar contraseña" as A5
  usecase "Cerrar sesión" as A6
  usecase "Crear o desactivar usuario" as A7
  usecase "Asignar sucursales\ny permisos" as A8
}
Usuario --> A1
Usuario --> A4
Usuario --> A5
Usuario --> A6
Administrador --> A7
Administrador --> A8
A1 .> A2 : <<include>>
A1 .> A3 : <<include>>
A4 .> A2 : <<include>>
"""),

    "07_casos_uso_compras_percepciones": diagram(r"""
left to right direction
title Casos de Uso - Compras y Percepciones
actor Propietario
actor Proveedor
rectangle "Módulo de compras" {
  usecase "Seleccionar proveedor" as C1
  usecase "Registrar productos y cantidades" as C2
  usecase "Registrar comprobante recibido" as C3
  usecase "Registrar percepción" as C4
  usecase "Validar serie, número y montos" as C5
  usecase "Actualizar inventario" as C6
  usecase "Registrar egreso y medio de pago" as C7
  usecase "Actualizar acumulado mensual" as C8
  usecase "Alertar aproximación o exceso\ndel límite configurado" as C9
  usecase "Consultar reporte de compras\ny percepciones" as C10
}
Propietario --> C1
Propietario --> C2
Propietario --> C3
Propietario --> C4
Propietario --> C10
Proveedor --> C1
Proveedor --> C3
C3 .> C5 : <<include>>
C4 .> C5 : <<include>>
C2 .> C6 : <<include>>
C2 .> C7 : <<include>>
C3 .> C8 : <<include>>
C8 .> C9 : <<extend>>
"""),

    "08_casos_uso_ventas_tickets_pagos": diagram(r"""
left to right direction
title Casos de Uso - Ventas, Tickets y Pagos
actor Operador
actor Cliente
rectangle "Módulo de ventas" {
  usecase "Abrir caja" as V1
  usecase "Buscar o escanear producto" as V2
  usecase "Agregar productos a la venta" as V3
  usecase "Calcular total" as V4
  usecase "Registrar uno o varios pagos" as V5
  usecase "Validar stock" as V6
  usecase "Descontar inventario" as V7
  usecase "Generar ticket interno" as V8
  usecase "Registrar venta al crédito" as V9
  usecase "Cerrar caja" as V10
}
Operador --> V1
Operador --> V2
Operador --> V3
Operador --> V5
Operador --> V8
Operador --> V9
Operador --> V10
Cliente --> V5
Cliente --> V9
V3 .> V4 : <<include>>
V3 .> V6 : <<include>>
V5 .> V7 : <<include>>
V5 .> V8 : <<include>>
V9 .> V5 : <<extend>>
"""),

    "09_casos_uso_inventario_productos": diagram(r"""
left to right direction
title Casos de Uso - Productos e Inventario
actor Administrador
actor Operador
rectangle "Módulo de logística" {
  usecase "Gestionar tipos, categorías\ny unidades de medida" as L1
  usecase "Registrar producto" as L2
  usecase "Asignar producto a sucursal" as L3
  usecase "Definir precio de compra y venta" as L4
  usecase "Consultar existencias" as L5
  usecase "Registrar ajuste de inventario" as L6
  usecase "Consultar kardex" as L7
  usecase "Configurar stock mínimo" as L8
  usecase "Recibir alerta de stock bajo" as L9
}
Administrador --> L1
Administrador --> L2
Administrador --> L3
Administrador --> L4
Administrador --> L6
Administrador --> L8
Operador --> L5
Operador --> L7
L2 .> L3 : <<include>>
L3 .> L4 : <<include>>
L8 .> L9 : <<extend>>
"""),

    "10_casos_uso_clientes_fiados": diagram(r"""
left to right direction
title Casos de Uso - Clientes, Fiados y Promociones
actor Propietario
actor Operador
actor Cliente
rectangle "Módulo de clientes" {
  usecase "Registrar cliente" as F1
  usecase "Consultar historial de compras" as F2
  usecase "Registrar venta fiada" as F3
  usecase "Definir fecha de vencimiento" as F4
  usecase "Registrar abono" as F5
  usecase "Consultar saldo pendiente" as F6
  usecase "Registrar puntos o frecuencia" as F7
  usecase "Asignar promoción o recompensa" as F8
  usecase "Generar reporte de clientes frecuentes" as F9
}
Propietario --> F1
Propietario --> F2
Propietario --> F5
Propietario --> F8
Propietario --> F9
Operador --> F1
Operador --> F3
Operador --> F5
Cliente --> F3
Cliente --> F5
Cliente --> F6
F3 .> F4 : <<include>>
F3 .> F7 : <<include>>
F7 .> F8 : <<extend>>
"""),

    "11_casos_uso_camaras_ia": diagram(r"""
left to right direction
title Casos de Uso - Cámaras y Alertas de Seguridad
actor Propietario
actor "Cámara IP" as Camara
actor "Servicio de IA" as IA
rectangle "Módulo de vigilancia" {
  usecase "Visualizar transmisión autorizada" as S1
  usecase "Configurar cámara y zona" as S2
  usecase "Capturar fotogramas" as S3
  usecase "Detectar personas u objetos" as S4
  usecase "Mantener trayectorias" as S5
  usecase "Evaluar patrón sospechoso" as S6
  usecase "Generar alerta" as S7
  usecase "Notificar en tiempo real" as S8
  usecase "Revisar y clasificar alerta" as S9
}
Propietario --> S1
Propietario --> S2
Propietario --> S9
Camara --> S3
IA --> S4
IA --> S5
IA --> S6
S3 .> S4 : <<include>>
S4 .> S5 : <<include>>
S5 .> S6 : <<include>>
S6 .> S7 : <<extend>>
S7 .> S8 : <<include>>
S8 .> S9 : <<include>>
"""),

    "12_clases_modelos_diseno": diagram(r"""
title Diagrama de Clases - Modelos del Dominio
hide empty methods
package "Seguridad" {
  class Usuario { +idUsuario: int\n+correo: string\n+estado: boolean }
  class Rol { +idRol: int\n+nombre: string }
  class Permiso { +idPermiso: int\n+nombre: string }
}
package "Logística" {
  class Producto { +idProducto: int\n+nombre: string\n+codigoBarras: string }
  class ProductoSucursal { +idProductoSucursal: int\n+precioCompra: decimal\n+precioVenta: decimal }
  class Inventario { +idInventario: int\n+stock: decimal\n+stockMinimo: decimal }
  class InventarioMovimiento { +idMovimiento: int\n+cantidad: decimal\n+stockAnterior: decimal\n+stockResultante: decimal }
}
package "Operaciones" {
  class Compra { +idCompra: int\n+fechaCompra: datetime\n+subtotal: decimal\n+igv: decimal\n+total: decimal }
  class CompraDetalle { +idDetalle: int\n+cantidad: decimal\n+precioUnitario: decimal }
  class Comprobante { +idComprobante: int\n+serie: string\n+numero: string }
  class CompraPercepcion { +idPercepcion: int\n+porcentaje: decimal\n+monto: decimal }
  class Ingreso { +idIngreso: int\n+monto: decimal\n+fechaIngreso: datetime }
  class DeudaCliente { +idDeuda: int\n+monto: decimal\n+saldo: decimal }
  class AbonoDeudaCliente { +idAbono: int\n+monto: decimal }
  class Caja { +idCaja: int\n+montoApertura: decimal\n+montoCierre: decimal }
}
Usuario "*" -- "1" Rol
Rol "*" -- "*" Permiso
Producto "1" -- "*" ProductoSucursal
ProductoSucursal "1" -- "1" Inventario
Inventario "1" -- "*" InventarioMovimiento
Compra "1" -- "*" CompraDetalle
Compra "1" -- "*" Comprobante
Compra "1" -- "0..1" CompraPercepcion
Ingreso "1" -- "0..1" DeudaCliente
DeudaCliente "1" -- "*" AbonoDeudaCliente
Caja "1" -- "*" Ingreso
"""),

    "13_clases_controladores_principales": diagram(r"""
title Diagrama de Clases - Controladores Principales
class AuthController { +login()\n+refresh()\n+cambiarContrasena()\n+logout() }
class UsuariosController { +listar()\n+crear()\n+actualizar()\n+asignarSucursales() }
class PersonasController { +listarClientes()\n+crearCliente()\n+listarProveedores()\n+crearProveedor() }
class LogisticaController { +listarProductos()\n+crearProducto()\n+consultarInventario()\n+registrarAjuste() }
class OperacionesController { +abrirCaja()\n+registrarCompra()\n+registrarVenta()\n+registrarAbono()\n+cerrarCaja() }
class ReportesController { +ventasPdf()\n+comprasExcel()\n+percepcionesPdf()\n+kardexExcel() }
class VigilanciaController { +listarCamaras()\n+verTransmision()\n+listarAlertas()\n+clasificarAlerta() }
interface AuthService
interface UsuariosService
interface PersonasService
interface LogisticaService
interface OperacionesService
interface ReportesService
interface VigilanciaService
AuthController --> AuthService
UsuariosController --> UsuariosService
PersonasController --> PersonasService
LogisticaController --> LogisticaService
OperacionesController --> OperacionesService
ReportesController --> ReportesService
VigilanciaController --> VigilanciaService
"""),

    "14_clases_controladores_logistica_operaciones": diagram(r"""
title Diagrama de Clases - Controladores de Logística y Operaciones
class LogisticaController {
  +crearProducto(dto)
  +actualizarProducto(id, dto)
  +consultarStock(filtros)
  +consultarKardex(filtros)
  +ajustarInventario(dto)
}
class OperacionesController {
  +abrirCaja(dto)
  +registrarCompra(dto)
  +registrarVenta(dto)
  +registrarEgreso(dto)
  +registrarAbono(dto)
  +cerrarCaja(id, dto)
}
class LogisticaService {
  +validarProducto()
  +actualizarStock()
  +registrarMovimiento()
  +verificarStockMinimo()
}
class OperacionesService {
  +validarCajaAbierta()
  +procesarCompra()
  +procesarVenta()
  +calcularPercepcion()
  +crearDeuda()
}
class PrismaService { +transaction()\n+producto\n+inventario\n+compra\ningreso\ndeudaCliente }
class EventosGateway { +publicarStock()\n+publicarCaja()\n+publicarAlerta() }
LogisticaController --> LogisticaService
OperacionesController --> OperacionesService
LogisticaService --> PrismaService
OperacionesService --> PrismaService
LogisticaService --> EventosGateway
OperacionesService --> EventosGateway
"""),

    "15_clases_controladores_usuarios_sesion": diagram(r"""
title Diagrama de Clases - Usuarios, Roles y Sesiones
class AuthController { +login(dto)\n+refresh(token)\n+logout()\n+cambiarContrasena(dto) }
class AuthService { +validarCredenciales()\n+emitirTokens()\n+revocarSesion()\n+hashContrasena() }
class UsuariosController { +listar()\n+crear(dto)\n+actualizar(id,dto)\n+asignarSucursales(id,dto) }
class UsuariosService { +buscarPorCorreo()\n+validarRol()\n+validarSucursales()\n+guardarUsuario() }
class RolesController { +listarRoles()\n+asignarPermisos() }
class RolesService { +obtenerPermisos()\n+actualizarPermisos() }
class JwtStrategy { +validate(payload) }
class JwtAuthGuard { +canActivate(context) }
class RolesGuard { +canActivate(context) }
class PermisosGuard { +canActivate(context) }
AuthController --> AuthService
UsuariosController --> UsuariosService
RolesController --> RolesService
AuthService --> JwtStrategy
JwtStrategy --> JwtAuthGuard
JwtAuthGuard --> RolesGuard
RolesGuard --> PermisosGuard
UsuariosService --> RolesService
"""),

    "16_actividad_registrar_compra_percepcion": diagram(r"""
title Diagrama de Actividades - Registro de Compra y Percepción
|Propietario u operador|
start
:Abrir módulo de compras;
:Seleccionar proveedor y sucursal;
:Ingresar productos, cantidades y precios;
:Registrar factura o comprobante recibido;
if (¿Documento incluye percepción?) then (Sí)
  :Ingresar base, porcentaje y monto;
endif
:Confirmar compra;
|Sistema|
:Validar proveedor, comprobante y montos;
if (¿Datos válidos?) then (Sí)
  :Iniciar transacción;
  :Guardar compra, detalle, comprobante\ny percepción;
  :Actualizar inventario y kardex;
  :Registrar egreso y forma de pago;
  :Actualizar acumulado mensual de compras;
  if (¿Se aproxima o supera el límite?) then (Sí)
    :Generar alerta informativa;
  endif
  :Confirmar transacción;
  :Notificar actualización por Socket.IO;
  |Propietario u operador|
  :Revisar resumen de la compra;
else (No)
  :Mostrar errores sin guardar cambios;
endif
stop
"""),

    "17_actividad_venta_ticket": diagram(r"""
title Diagrama de Actividades - Venta y Ticket Interno
|Operador|
start
:Abrir caja y módulo de ventas;
:Buscar o escanear productos;
:Indicar cantidades;
|Sistema|
:Consultar precios y existencias;
if (¿Stock suficiente?) then (Sí)
  :Calcular total;
  |Operador|
  :Seleccionar medio de pago;
  if (¿Venta al crédito?) then (Sí)
    :Seleccionar o registrar cliente;
    :Indicar fecha de vencimiento;
  endif
  :Confirmar venta;
  |Sistema|
  :Guardar venta y detalle;
  :Registrar pago o crear deuda;
  :Descontar inventario y registrar kardex;
  :Actualizar caja;
  :Generar ticket interno en PDF;
  :Notificar cambios por Socket.IO;
  |Operador|
  :Imprimir o compartir ticket;
else (No)
  :Mostrar producto sin stock suficiente;
endif
stop
"""),

    "18_actividad_fiado_abono": diagram(r"""
title Diagrama de Actividades - Fiado y Abono
|Operador|
start
:Buscar cliente;
|Sistema|
:Mostrar deudas y saldo pendiente;
|Operador|
if (¿Nueva venta fiada?) then (Sí)
  :Registrar productos de la venta;
  :Definir vencimiento;
  |Sistema|
  :Crear venta, deuda y movimiento de inventario;
  :Generar ticket interno;
else (Abono)
  :Seleccionar deuda;
  :Ingresar monto y medio de pago;
  |Sistema|
  :Validar que el monto no exceda el saldo;
  if (¿Monto válido?) then (Sí)
    :Registrar abono e ingreso de caja;
    :Actualizar saldo de la deuda;
    if (¿Saldo igual a cero?) then (Sí)
      :Marcar deuda como cancelada;
    endif
  else (No)
    :Solicitar corrección del monto;
  endif
endif
:Actualizar historial del cliente;
|Operador|
:Entregar constancia interna;
stop
"""),

    "19_actividad_supervision_ia": diagram(r"""
title Diagrama de Actividades - Supervisión y Alerta con IA
|Cámara IP|
start
:Transmitir video RTSP;
|Servicio de visión|
:Capturar y normalizar fotogramas;
:Detectar personas u objetos con YOLOv8;
:Mantener trayectorias con ByteTrack;
:Evaluar secuencia temporal;
if (¿Patrón supera el umbral?) then (Sí)
  :Crear alerta con fecha, cámara\ny evidencia asociada;
  |Backend|
  :Registrar alerta;
  :Notificar mediante Socket.IO;
  |Propietario|
  :Revisar transmisión y evidencia;
  if (¿Alerta confirmada?) then (Sí)
    :Aplicar protocolo de seguridad;
  else (No)
    :Clasificar como falsa alerta;
  endif
else (No)
  :Continuar monitoreo;
endif
stop
"""),

    "20_componentes_general": diagram(r"""
title Diagrama de Componentes General
actor Usuario
component "Frontend Vue.js\nTypeScript + Vuetify" as Front
component "API REST NestJS" as Api
component "Autenticación JWT\nRoles y permisos" as Auth
component "Módulo de logística" as Log
component "Módulo de operaciones" as Ops
component "Módulo de reportes\nPDF y Excel" as Rep
component "Gateway Socket.IO" as Sock
component "Servicio de visión\nPython + OpenCV + IA" as Vision
database "MySQL" as DB
cloud "Cámaras IP / RTSP" as Cam
Usuario --> Front
Front --> Api : HTTPS / JSON
Front <--> Sock : WebSocket
Api --> Auth
Api --> Log
Api --> Ops
Api --> Rep
Api --> DB : Prisma ORM
Sock --> DB
Cam --> Vision : RTSP
Vision --> Api : eventos de alerta
Api --> Sock : notificaciones
"""),

    "21_componentes_frontend": diagram(r"""
title Diagrama de Componentes Frontend
package "Aplicación Vue.js" {
  component "Router" as Router
  component "Layout de autenticación" as AuthLayout
  component "Layout principal" as MainLayout
  component "Store de autenticación" as AuthStore
  component "Cliente HTTP" as HTTP
  component "Cliente Socket.IO" as Socket
  component "Usuarios y roles" as Users
  component "Productos e inventario" as Inventory
  component "Compras y percepciones" as Purchases
  component "Ventas, caja y fiados" as Sales
  component "Clientes y promociones" as Clients
  component "Reportes y vigilancia" as Reports
}
cloud "API NestJS" as API
cloud "Gateway Socket.IO" as WS
Router --> AuthLayout
Router --> MainLayout
MainLayout --> Users
MainLayout --> Inventory
MainLayout --> Purchases
MainLayout --> Sales
MainLayout --> Clients
MainLayout --> Reports
AuthLayout --> AuthStore
AuthStore --> HTTP
Users --> HTTP
Inventory --> HTTP
Purchases --> HTTP
Sales --> HTTP
Clients --> HTTP
Reports --> HTTP
MainLayout --> Socket
HTTP --> API : HTTPS
Socket --> WS : WebSocket
"""),

    "22_componentes_backend": diagram(r"""
title Diagrama de Componentes Backend
package "NestJS" {
  component "AuthModule" as Auth
  component "UsuariosModule" as Users
  component "SucursalesModule" as Branch
  component "PersonasModule" as People
  component "AdministraciónModule" as Admin
  component "LogisticaModule" as Logistics
  component "OperacionesModule" as Operations
  component "ReportesModule" as Reports
  component "VigilanciaModule" as Surveillance
  component "Guards JWT, roles\ny permisos" as Guards
  component "Gateway Socket.IO" as Socket
  component "PrismaModule" as Prisma
}
database "MySQL" as DB
cloud "Servicio IA" as IA
Auth --> Guards
Users --> Guards
Branch --> Guards
People --> Guards
Admin --> Guards
Logistics --> Guards
Operations --> Guards
Reports --> Guards
Surveillance --> Guards
Auth --> Prisma
Users --> Prisma
Branch --> Prisma
People --> Prisma
Admin --> Prisma
Logistics --> Prisma
Operations --> Prisma
Reports --> Prisma
Surveillance --> Prisma
Prisma --> DB
Operations --> Socket
Logistics --> Socket
IA --> Surveillance
Surveillance --> Socket
"""),

    "23_componentes_vision_ia": diagram(r"""
title Diagrama de Componentes - Vigilancia e Inteligencia Artificial
cloud "Cámaras IP" as Cameras
component "Conector RTSP" as RTSP
component "Captura y muestreo\nOpenCV" as Capture
component "Detector de objetos\nYOLOv8" as YOLO
component "Seguimiento\nByteTrack" as Track
component "Modelo temporal\nde comportamiento" as Temporal
component "Gestor de alertas" as Alerts
component "API NestJS" as API
component "Gateway Socket.IO" as Socket
database "Metadatos y alertas\nMySQL" as DB
Cameras --> RTSP
RTSP --> Capture
Capture --> YOLO
YOLO --> Track
Track --> Temporal
Temporal --> Alerts : patrón sobre umbral
Alerts --> API : evento y evidencia
API --> DB
API --> Socket
note bottom of Temporal
La clasificación automática es una señal de apoyo.
La decisión final corresponde al usuario autorizado.
end note
"""),

    "24_despliegue": diagram(r"""
title Diagrama de Despliegue
node "Equipo del usuario" as Client {
  artifact "Navegador web" as Browser
}
node "Red local de la tienda" as LAN {
  node "Cámaras IP" as Cameras
  node "Impresora de tickets" as Printer
}
node "Servidor de aplicación" as AppServer {
  artifact "Frontend Vue.js" as Front
  artifact "API NestJS" as API
  artifact "Gateway Socket.IO" as WS
  artifact "Generador PDF / Excel" as Docs
}
node "Servidor de datos" as DataServer {
  database "MySQL" as DB
  folder "Copias de seguridad" as Backup
}
node "Servidor de visión" as VisionServer {
  artifact "Python + OpenCV" as CV
  artifact "YOLOv8 + ByteTrack" as Models
}
cloud "Servicio de consulta\nDNI / RUC" as External
Browser --> Front : HTTPS
Front --> API : REST / JSON
Browser <--> WS : WebSocket seguro
API --> DB : TCP 3306
DB --> Backup : respaldo programado
API --> Docs
Browser --> Printer : impresión local
Cameras --> CV : RTSP
CV --> Models
Models --> API : alertas HTTP
API --> External : HTTPS
"""),
}


def main() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    IMG.mkdir(parents=True, exist_ok=True)

    for name, content in DIAGRAMS.items():
        source = SRC / f"{name}.puml"
        source.write_text(content, encoding="utf-8")
        subprocess.run(
            [
                str(JAVA),
                "-Dfile.encoding=UTF-8",
                "-DPLANTUML_LIMIT_SIZE=8192",
                "-jar",
                str(JAR),
                "-charset",
                "UTF-8",
                "-tpng",
                str(source),
            ],
            check=True,
        )
        generated = source.with_suffix(".png")
        shutil.move(str(generated), str(IMG / generated.name))

    detailed_er = Path(r"C:\Users\Power\Downloads\diagrama_store_w.png")
    if detailed_er.exists():
        shutil.copy2(detailed_er, IMG / "25_modelo_base_datos_detallado.png")

    print(f"Generated {len(list(IMG.glob('*.png')))} diagrams in {IMG}")


if __name__ == "__main__":
    main()
