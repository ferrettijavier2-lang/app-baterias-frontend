import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Battery, ShoppingCart, Wallet, ShieldCheck, Printer, Search } from "lucide-react";

const DEFAULT_ADMIN_PASSWORD = "bateria2026";
const STORAGE_KEY = "baterias_app_data_vfinal";
const API_URL = "https://backend-baterias-limpio.onrender.com/api";

const productosIniciales = [
  { id: 1, nombre: "Batería 12x65", precio: 120000, stock: 8, casco: 15000 },
  { id: 2, nombre: "Batería 12x75", precio: 145000, stock: 6, casco: 18000 },
  { id: 3, nombre: "Batería 12x90", precio: 178000, stock: 4, casco: 22000 },
  { id: 4, nombre: "Batería 12x110", precio: 215000, stock: 3, casco: 26000 },
];

const clientesIniciales = {
  "Juan Pérez": { telefono: "3462-111111", deudaDinero: 0, bateriasViejas: 0, historial: [] },
  "María Gómez": { telefono: "3462-222222", deudaDinero: 35000, bateriasViejas: 1, historial: ["Debe saldo anterior"] },
};

const metodosPago = ["Efectivo", "Débito", "3 cuotas", "6 cuotas", "Transferencia"];

const formatearPrecio = (valor) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(valor || 0);

const Card = ({ children, className = "" }) => <div className={`bg-white rounded-3xl shadow-xl ${className}`}>{children}</div>;
const CardContent = ({ children, className = "" }) => <div className={className}>{children}</div>;
const Button = ({ children, className = "", variant = "default", ...props }) => {
  const base = "px-4 py-3 font-semibold transition rounded-2xl";
  const styles = variant === "outline"
    ? "border border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
    : "bg-blue-600 hover:bg-blue-700 text-white";
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>;
};
const Input = ({ className = "", ...props }) => (
  <input className={`w-full px-4 py-3 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 ${className}`} {...props} />
);

export default function App() {
  const [vista, setVista] = useState("inicio");
  const [pantallaCliente, setPantallaCliente] = useState("inicio");
  const [adminPass, setAdminPass] = useState("");
  const [productos, setProductos] = useState(productosIniciales);
  const [clientes, setClientes] = useState(clientesIniciales);
  const [ventas, setVentas] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [clienteCompra, setClienteCompra] = useState("");
  const [telefonoCompra, setTelefonoCompra] = useState("");
  const [entregaCasco, setEntregaCasco] = useState(true);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("");
  const [ventaACuenta, setVentaACuenta] = useState(false);
  const [montoEntregado, setMontoEntregado] = useState("");
  const [clienteConsulta, setClienteConsulta] = useState("");
  const [resultadoCliente, setResultadoCliente] = useState(null);

  const hoyTexto = new Date().toLocaleDateString("es-AR");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await fetch(`${API_URL}/data`);
        if (res.ok) {
          const data = await res.json();
          if (data.productos) setProductos(data.productos);
          if (data.clientes) setClientes(data.clientes);
          if (data.ventas) setVentas(data.ventas);
          return;
        }
      } catch (error) {
        console.warn("No se pudo conectar al backend, usando modo local.", error);
      }
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        try {
          const data = JSON.parse(guardado);
          if (data.productos) setProductos(data.productos);
          if (data.clientes) setClientes(data.clientes);
          if (data.ventas) setVentas(data.ventas);
        } catch (e) {
          console.error("Error cargando datos locales", e);
        }
      }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    const payload = { productos, clientes, ventas };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    const guardarRemoto = async () => {
      try {
        await fetch(`${API_URL}/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.warn("No se pudo guardar en backend, quedó guardado localmente.", error);
      }
    };
    guardarRemoto();
  }, [productos, clientes, ventas]);

  const numeroOrden = useMemo(() => `ORD-${Date.now().toString().slice(-6)}`, [productoSeleccionado, clienteCompra]);
  const precioBase = productoSeleccionado ? productoSeleccionado.precio + (entregaCasco ? 0 : productoSeleccionado.casco) : 0;
  const porcentajeRecargo = metodoSeleccionado === "3 cuotas" ? 15 : metodoSeleccionado === "6 cuotas" ? 30 : 0;
  const totalFinal = precioBase + precioBase * (porcentajeRecargo / 100);
  const valorCuota = metodoSeleccionado === "3 cuotas" ? totalFinal / 3 : metodoSeleccionado === "6 cuotas" ? totalFinal / 6 : 0;

  const resetCompra = () => {
    setProductoSeleccionado(null);
    setClienteCompra("");
    setTelefonoCompra("");
    setEntregaCasco(true);
    setMetodoSeleccionado("");
    setVentaACuenta(false);
    setMontoEntregado("");
  };

  const loginAdmin = () => {
    if (adminPass === DEFAULT_ADMIN_PASSWORD) {
      alert("Ingreso administrador correcto");
    } else alert("Clave incorrecta");
  };

  const seleccionarProducto = (producto) => {
    if (producto.stock <= 0) return alert("No hay stock disponible.");
    setProductoSeleccionado(producto);
    setPantallaCliente("comprar");
  };

  const confirmarVenta = () => {
    if (!productoSeleccionado || !clienteCompra || !metodoSeleccionado) return alert("Completá cliente, producto y método de pago.");
    const entregado = ventaACuenta ? Number(montoEntregado || 0) : totalFinal;
    const deudaGenerada = Math.max(totalFinal - entregado, 0);

    const nuevaVenta = {
      orden: numeroOrden,
      cliente: clienteCompra,
      producto: productoSeleccionado.nombre,
      metodo: metodoSeleccionado,
      total: totalFinal,
      cascoPendiente: !entregaCasco,
      fecha: new Date().toLocaleString("es-AR"),
      fechaDia: hoyTexto,
      deudaGenerada,
      telefono: telefonoCompra,
    };

    setVentas((prev) => [nuevaVenta, ...prev]);
    setProductos((prev) => prev.map((item) => (item.id === productoSeleccionado.id ? { ...item, stock: Math.max(item.stock - 1, 0) } : item)));
    setClientes((prev) => {
      const existente = prev[clienteCompra] || { deudaDinero: 0, bateriasViejas: 0, telefono: telefonoCompra || "No informado", historial: [] };
      return {
        ...prev,
        [clienteCompra]: {
          ...existente,
          telefono: telefonoCompra || existente.telefono,
          deudaDinero: existente.deudaDinero + deudaGenerada,
          bateriasViejas: existente.bateriasViejas + (!entregaCasco ? 1 : 0),
          historial: [`${nuevaVenta.orden} · ${nuevaVenta.fecha} · ${productoSeleccionado.nombre} · ${metodoSeleccionado} · ${formatearPrecio(totalFinal)}`, ...existente.historial],
        },
      };
    });

    alert(`Venta registrada: ${nuevaVenta.orden}`);
    window.print();
    resetCompra();
    setPantallaCliente("inicio");
  };

  const buscarCliente = () => {
    const encontrado = clientes[clienteConsulta];
    if (encontrado) setResultadoCliente({ nombre: clienteConsulta, ...encontrado });
    else {
      setResultadoCliente(null);
      alert("Cliente no encontrado.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#e2e8f0", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900 }}>Sistema de Baterías</h1>
        <p style={{ color: "#475569" }}>Autogestión minorista</p>

        {vista === "inicio" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 30 }}>
            <div style={{ background: "white", padding: 30, borderRadius: 20 }}>
              <h2>Minorista</h2>
              <button onClick={() => { setVista("cliente"); setPantallaCliente("inicio"); }}>Ingresar</button>
            </div>
            <div style={{ background: "white", padding: 30, borderRadius: 20 }}>
              <h2>Administrador</h2>
              <input type="password" placeholder="Clave" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
              <button onClick={loginAdmin}>Entrar</button>
            </div>
          </div>
        )}

        {vista === "cliente" && (
          <div style={{ marginTop: 30 }}>
            <button onClick={() => setVista("inicio")}>Volver</button>

            {pantallaCliente === "inicio" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
                <div style={{ background: "white", padding: 30, borderRadius: 20 }}>
                  <h2>Comprar un nuevo producto</h2>
                  <button onClick={() => setPantallaCliente("catalogo")}>Ver catálogo</button>
                </div>
                <div style={{ background: "white", padding: 30, borderRadius: 20 }}>
                  <h2>Saldar la cuenta</h2>
                  <button onClick={() => setPantallaCliente("saldar")}>Consultar cuenta</button>
                </div>
              </div>
            )}

            {pantallaCliente === "catalogo" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
                {productos.map((producto) => (
                  <div key={producto.id} style={{ background: "white", padding: 20, borderRadius: 20 }}>
                    <h3>{producto.nombre}</h3>
                    <p>{formatearPrecio(producto.precio)}</p>
                    <p>Stock: {producto.stock}</p>
                    <button onClick={() => seleccionarProducto(producto)}>Seleccionar</button>
                  </div>
                ))}
              </div>
            )}

            {pantallaCliente === "comprar" && productoSeleccionado && (
              <div style={{ marginTop: 20, background: "white", padding: 30, borderRadius: 20 }}>
                <h2>Detalle de compra</h2>
                <input placeholder="Nombre del cliente" value={clienteCompra} onChange={(e) => setClienteCompra(e.target.value)} />
                <input placeholder="Teléfono" value={telefonoCompra} onChange={(e) => setTelefonoCompra(e.target.value)} />
                <p><strong>Producto:</strong> {productoSeleccionado.nombre}</p>
                <p><strong>Precio:</strong> {formatearPrecio(productoSeleccionado.precio)}</p>
                <p><strong>Orden:</strong> {numeroOrden}</p>
                <label><input type="checkbox" checked={entregaCasco} onChange={() => setEntregaCasco(!entregaCasco)} /> Entrega batería vieja</label>
                <label><input type="checkbox" checked={ventaACuenta} onChange={() => setVentaACuenta(!ventaACuenta)} /> Venta a cuenta</label>
                {ventaACuenta && <input type="number" placeholder="Monto entregado" value={montoEntregado} onChange={(e) => setMontoEntregado(e.target.value)} />}

                <h3>Métodos de pago</h3>
                {metodosPago.map((metodo) => (
                  <button key={metodo} onClick={() => setMetodoSeleccionado(metodo)} style={{ marginRight: 10 }}>{metodo}</button>
                ))}

                <p><strong>Total final:</strong> {formatearPrecio(totalFinal)}</p>
                {valorCuota > 0 && <p><strong>Valor por cuota:</strong> {formatearPrecio(valorCuota)}</p>}

                <button onClick={confirmarVenta}>Confirmar venta</button>
              </div>
            )}

            {pantallaCliente === "saldar" && (
              <div style={{ marginTop: 20, background: "white", padding: 30, borderRadius: 20 }}>
                <h2>Saldar cuenta</h2>
                <input placeholder="Ingresar nombre del cliente" value={clienteConsulta} onChange={(e) => setClienteConsulta(e.target.value)} />
                <button onClick={buscarCliente}>Buscar</button>
                {resultadoCliente && (
                  <div style={{ marginTop: 20 }}>
                    <p><strong>Cliente:</strong> {resultadoCliente.nombre}</p>
                    <p><strong>Teléfono:</strong> {resultadoCliente.telefono}</p>
                    <p><strong>Deuda:</strong> {formatearPrecio(resultadoCliente.deudaDinero)}</p>
                    <p><strong>Baterías viejas pendientes:</strong> {resultadoCliente.bateriasViejas}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
