import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Battery, ShoppingCart, Wallet, ShieldCheck, Printer, Trash2, Pencil, KeyRound, Search } from "lucide-react";

const DEFAULT_ADMIN_PASSWORD = "1234";
const STORAGE_KEY = "baterias_app_data_vfinal";
const API_URL = "https://app-baterias.onrender.com/api";

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

export default function AppBateriasFinal() {
  const [vista, setVista] = useState("inicio");
  const [pantallaCliente, setPantallaCliente] = useState("inicio");
  const [pantallaAdmin, setPantallaAdmin] = useState("dashboard");

  const [adminPass, setAdminPass] = useState("");
  const [adminPassword, setAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [nuevaClave, setNuevaClave] = useState("");

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

  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", precio: "", stock: "", casco: "" });
  const [productoEditandoId, setProductoEditandoId] = useState(null);
  const [productoEditado, setProductoEditado] = useState({ nombre: "", precio: "", stock: "", casco: "" });

  const [clienteEditando, setClienteEditando] = useState(null);
  const [clienteEditado, setClienteEditado] = useState({ nombre: "", telefono: "", deudaDinero: "", bateriasViejas: "" });

  const [filtroVentas, setFiltroVentas] = useState("");
  const [soloHoy, setSoloHoy] = useState(false);

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
          if (data.adminPassword) setAdminPassword(data.adminPassword);
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
          if (data.adminPassword) setAdminPassword(data.adminPassword);
        } catch (e) {
          console.error("Error cargando datos locales", e);
        }
      }
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    const payload = { productos, clientes, ventas, adminPassword };
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
  }, [productos, clientes, ventas, adminPassword]);

  const numeroOrden = useMemo(() => `ORD-${Date.now().toString().slice(-6)}`, [productoSeleccionado, clienteCompra]);
  const precioBase = productoSeleccionado ? productoSeleccionado.precio + (entregaCasco ? 0 : productoSeleccionado.casco) : 0;
  const porcentajeRecargo = metodoSeleccionado === "3 cuotas" ? 15 : metodoSeleccionado === "6 cuotas" ? 30 : 0;
  const totalFinal = precioBase + precioBase * (porcentajeRecargo / 100);
  const valorCuota = metodoSeleccionado === "3 cuotas" ? totalFinal / 3 : metodoSeleccionado === "6 cuotas" ? totalFinal / 6 : 0;

  const deudaTotal = Object.values(clientes).reduce((acc, c) => acc + (c.deudaDinero || 0), 0);
  const cascosPendientes = Object.values(clientes).reduce((acc, c) => acc + (c.bateriasViejas || 0), 0);
  const ventasHoyImporte = ventas.filter((v) => v.fechaDia === hoyTexto).reduce((acc, v) => acc + (v.total || 0), 0);
  const ventasDelDia = ventas.filter((v) => v.fechaDia === hoyTexto);
  const ventasACuentaHoy = ventasDelDia.filter((v) => v.ventaACuenta).length;
  const deudaGeneradaHoy = ventasDelDia.reduce((acc, v) => acc + (v.deudaGenerada || 0), 0);
  const clientesConDeuda = Object.entries(clientes).filter(([, data]) => data.deudaDinero > 0).length;
  const clientesConCascoPendiente = Object.entries(clientes).filter(([, data]) => data.bateriasViejas > 0).length;

  const resumenCajaHoy = ventasDelDia.reduce(
    (acc, venta) => {
      acc.total += venta.montoEntregado || 0;
      acc[venta.metodo] = (acc[venta.metodo] || 0) + (venta.montoEntregado || 0);
      return acc;
    },
    { total: 0, Efectivo: 0, Débito: 0, Transferencia: 0, "3 cuotas": 0, "6 cuotas": 0 }
  );

  const ventasFiltradas = ventas.filter((venta) => {
    const texto = filtroVentas.toLowerCase();
    const coincideTexto =
      !filtroVentas ||
      venta.cliente.toLowerCase().includes(texto) ||
      venta.producto.toLowerCase().includes(texto) ||
      venta.orden.toLowerCase().includes(texto);
    const coincideHoy = !soloHoy || venta.fechaDia === hoyTexto;
    return coincideTexto && coincideHoy;
  });

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
    if (adminPass === adminPassword) {
      setVista("admin");
      setAdminPass("");
    } else {
      alert("Clave incorrecta");
    }
  };

  const seleccionarProducto = (producto) => {
    if (producto.stock <= 0) return alert("No hay stock disponible.");
    setProductoSeleccionado(producto);
    setPantallaCliente("comprar");
  };

  const confirmarVenta = () => {
    if (!productoSeleccionado || !clienteCompra || !metodoSeleccionado) return alert("Completá cliente, producto y método de pago.");
    if (productoSeleccionado.stock <= 0) return alert("No hay stock disponible para este producto.");

    const entregado = ventaACuenta ? Number(montoEntregado || 0) : totalFinal;
    if (entregado < 0) return alert("Monto inválido.");

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
      precioBase,
      recargo: porcentajeRecargo,
      valorCuota,
      ventaACuenta,
      montoEntregado: entregado,
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
          historial: [`${nuevaVenta.orden} · ${nuevaVenta.fecha} · ${productoSeleccionado.nombre} · ${metodoSeleccionado} · ${formatearPrecio(totalFinal)}${deudaGenerada > 0 ? ` · Debe ${formatearPrecio(deudaGenerada)}` : ""}`, ...existente.historial],
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
    if (encontrado) {
      setResultadoCliente({ nombre: clienteConsulta, ...encontrado });
    } else {
      setResultadoCliente(null);
      alert("Cliente no encontrado.");
    }
  };

  const saldarCuenta = () => {
    if (!resultadoCliente) return;
    setClientes((prev) => ({
      ...prev,
      [resultadoCliente.nombre]: {
        ...prev[resultadoCliente.nombre],
        deudaDinero: 0,
        bateriasViejas: 0,
        historial: [`${new Date().toLocaleString("es-AR")} · Cuenta saldada`, ...prev[resultadoCliente.nombre].historial],
      },
    }));
    setResultadoCliente((prev) => ({ ...prev, deudaDinero: 0, bateriasViejas: 0 }));
    alert("Cuenta saldada correctamente.");
  };

  const agregarProducto = () => {
    if (!nuevoProducto.nombre || !nuevoProducto.precio) return;
    const nuevo = {
      id: Date.now(),
      nombre: nuevoProducto.nombre,
      precio: Number(nuevoProducto.precio),
      stock: Number(nuevoProducto.stock || 0),
      casco: Number(nuevoProducto.casco || 0),
    };
    setProductos((prev) => [...prev, nuevo]);
    setNuevoProducto({ nombre: "", precio: "", stock: "", casco: "" });
  };

  const eliminarProducto = (id) => setProductos((prev) => prev.filter((p) => p.id !== id));
  const iniciarEdicionProducto = (p) => {
    setProductoEditandoId(p.id);
    setProductoEditado({ nombre: p.nombre, precio: p.precio, stock: p.stock, casco: p.casco });
  };
  const guardarEdicionProducto = () => {
    setProductos((prev) => prev.map((p) => (p.id === productoEditandoId ? { ...p, ...productoEditado, precio: Number(productoEditado.precio), stock: Number(productoEditado.stock), casco: Number(productoEditado.casco) } : p)));
    setProductoEditandoId(null);
  };

  const iniciarEdicionCliente = (nombre, data) => {
    setClienteEditando(nombre);
    setClienteEditado({ nombre, telefono: data.telefono, deudaDinero: data.deudaDinero, bateriasViejas: data.bateriasViejas });
  };
  const guardarEdicionCliente = (nombreOriginal) => {
    const nuevoNombre = clienteEditado.nombre.trim();
    if (!nuevoNombre) return;
    setClientes((prev) => {
      const copia = { ...prev };
      const historial = copia[nombreOriginal]?.historial || [];
      delete copia[nombreOriginal];
      copia[nuevoNombre] = {
        telefono: clienteEditado.telefono,
        deudaDinero: Number(clienteEditado.deudaDinero) || 0,
        bateriasViejas: Number(clienteEditado.bateriasViejas) || 0,
        historial,
      };
      return copia;
    });
    setClienteEditando(null);
  };

  const cambiarClaveAdmin = () => {
    if (!nuevaClave.trim()) return alert("Ingresá una nueva clave.");
    setAdminPassword(nuevaClave.trim());
    setNuevaClave("");
    alert("Clave actualizada correctamente.");
  };

  const anularVenta = (orden) => {
    const venta = ventas.find((v) => v.orden === orden);
    if (!venta) return;
    if (!window.confirm(`¿Anular la venta ${orden}?`)) return;

    setVentas((prev) => prev.filter((v) => v.orden !== orden));
    setProductos((prev) => prev.map((p) => (p.nombre === venta.producto ? { ...p, stock: p.stock + 1 } : p)));
    setClientes((prev) => {
      const cliente = prev[venta.cliente];
      if (!cliente) return prev;
      return {
        ...prev,
        [venta.cliente]: {
          ...cliente,
          deudaDinero: Math.max(cliente.deudaDinero - (venta.deudaGenerada || 0), 0),
          bateriasViejas: Math.max(cliente.bateriasViejas - (venta.cascoPendiente ? 1 : 0), 0),
          historial: cliente.historial.filter((h) => !h.includes(venta.orden)),
        },
      };
    });
    alert("Venta anulada correctamente.");
  };

  const reiniciarSistema = () => {
    if (!window.confirm("¿Seguro que querés borrar todos los datos guardados?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setProductos(productosIniciales);
    setClientes(clientesIniciales);
    setVentas([]);
    setAdminPassword(DEFAULT_ADMIN_PASSWORD);
    alert("Sistema reiniciado correctamente.");
  };

  const ultimoComprobante = ventas[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 md:p-8 print:bg-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900">Sistema de Baterías</h1>
            <p className="text-slate-600 mt-2">Autogestión minorista + administración completa</p>
          </div>
          <Battery className="w-12 h-12 text-blue-600" />
        </motion.div>

        {vista === "inicio" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-3xl shadow-xl"><CardContent className="p-8 text-center space-y-5"><ShoppingCart className="w-14 h-14 mx-auto text-blue-600" /><h2 className="text-2xl font-bold">Minorista</h2><p className="text-slate-600">Compra o consultá tu cuenta.</p><Button className="w-full rounded-2xl text-lg py-6" onClick={() => { setVista("cliente"); setPantallaCliente("inicio"); }}>Ingresar</Button></CardContent></Card>
            <Card className="rounded-3xl shadow-xl"><CardContent className="p-8 text-center space-y-5"><ShieldCheck className="w-14 h-14 mx-auto text-emerald-600" /><h2 className="text-2xl font-bold">Administrador</h2><div className="flex gap-3"><Input type="password" placeholder="Clave" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} className="rounded-2xl" /><Button className="rounded-2xl" onClick={loginAdmin}>Entrar</Button></div></CardContent></Card>
          </div>
        )}

        {vista === "cliente" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-2xl" onClick={() => setVista("inicio")}>Volver</Button>
              <Button className="rounded-2xl" onClick={() => setPantallaCliente("inicio")}>Inicio</Button>
            </div>

            {pantallaCliente === "inicio" && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="rounded-3xl shadow-xl"><CardContent className="p-8 text-center space-y-5"><ShoppingCart className="w-12 h-12 mx-auto text-blue-600" /><h2 className="text-2xl font-bold">Comprar un nuevo producto</h2><Button className="w-full rounded-2xl text-lg py-6" onClick={() => setPantallaCliente("catalogo")}>Ver catálogo</Button></CardContent></Card>
                <Card className="rounded-3xl shadow-xl"><CardContent className="p-8 text-center space-y-5"><Wallet className="w-12 h-12 mx-auto text-amber-600" /><h2 className="text-2xl font-bold">Saldar la cuenta</h2><Button className="w-full rounded-2xl text-lg py-6" onClick={() => setPantallaCliente("saldar")}>Consultar cuenta</Button></CardContent></Card>
              </div>
            )}

            {pantallaCliente === "catalogo" && (
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                {productos.map((producto) => (
                  <Card key={producto.id} className="rounded-3xl shadow-xl"><CardContent className="p-6 space-y-3"><h3 className="text-xl font-bold">{producto.nombre}</h3><p className="text-2xl font-black text-emerald-700">{formatearPrecio(producto.precio)}</p><p className={`text-sm ${producto.stock <= 2 ? "text-red-600 font-semibold" : "text-slate-500"}`}>Stock: {producto.stock} {producto.stock <= 2 ? "· STOCK BAJO" : ""}</p><p className="text-sm text-slate-500">Casco: {formatearPrecio(producto.casco)}</p><Button disabled={producto.stock <= 0} className="w-full rounded-2xl" onClick={() => seleccionarProducto(producto)}>{producto.stock <= 0 ? "Sin stock" : "Seleccionar"}</Button></CardContent></Card>
                ))}
              </div>
            )}

            {pantallaCliente === "comprar" && productoSeleccionado && (
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="rounded-3xl shadow-xl"><CardContent className="p-8 space-y-4"><h2 className="text-2xl font-bold">Detalle de compra</h2><Input placeholder="Nombre del cliente" value={clienteCompra} onChange={(e) => setClienteCompra(e.target.value)} className="rounded-2xl" /><Input placeholder="Teléfono" value={telefonoCompra} onChange={(e) => setTelefonoCompra(e.target.value)} className="rounded-2xl" /><p><strong>Producto:</strong> {productoSeleccionado.nombre}</p><p><strong>Precio:</strong> {formatearPrecio(productoSeleccionado.precio)}</p><p><strong>Orden:</strong> {numeroOrden}</p><p><strong>Fecha:</strong> {new Date().toLocaleString("es-AR")}</p><label className="flex items-center gap-3"><input type="checkbox" checked={entregaCasco} onChange={() => setEntregaCasco(!entregaCasco)} />Entrega batería vieja</label><label className="flex items-center gap-3"><input type="checkbox" checked={ventaACuenta} onChange={() => setVentaACuenta(!ventaACuenta)} />Venta a cuenta</label>{ventaACuenta && <Input type="number" placeholder="Monto entregado por el cliente" value={montoEntregado} onChange={(e) => setMontoEntregado(e.target.value)} className="rounded-2xl" />}{!entregaCasco && <p className="text-amber-700">Casco agregado: {formatearPrecio(productoSeleccionado.casco)}</p>}<div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2"><p>Total final: <strong>{formatearPrecio(totalFinal)}</strong></p>{ventaACuenta && <><p>Entregado: <strong>{formatearPrecio(Number(montoEntregado || 0))}</strong></p><p>Saldo pendiente: <strong>{formatearPrecio(Math.max(totalFinal - Number(montoEntregado || 0), 0))}</strong></p></>}</div><div className="flex gap-3"><Button className="rounded-2xl" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Imprimir</Button><Button className="rounded-2xl" onClick={confirmarVenta}>Confirmar venta</Button></div></CardContent></Card>

                <Card className="rounded-3xl shadow-xl"><CardContent className="p-8 space-y-4"><h2 className="text-2xl font-bold">Métodos de pago</h2>{metodosPago.map((metodo) => <button key={metodo} onClick={() => setMetodoSeleccionado(metodo)} className={`w-full text-left px-5 py-4 rounded-2xl border ${metodoSeleccionado === metodo ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>{metodo}</button>)}{metodoSeleccionado && <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm space-y-2"><p>Precio base: <strong>{formatearPrecio(precioBase)}</strong></p><p>Recargo: <strong>{porcentajeRecargo}%</strong></p><p>Total final: <strong>{formatearPrecio(totalFinal)}</strong></p>{valorCuota > 0 && <p>Valor por cuota: <strong>{formatearPrecio(valorCuota)}</strong></p>}</div>}</CardContent></Card>

                {ultimoComprobante && <Card className="rounded-3xl shadow-xl lg:col-span-2 print:shadow-none"><CardContent className="p-8"><h2 className="text-2xl font-bold mb-6">Último comprobante</h2><div className="grid md:grid-cols-2 gap-4 text-sm"><p><strong>Negocio:</strong> Baterías</p><p><strong>Orden:</strong> {ultimoComprobante.orden}</p><p><strong>Fecha:</strong> {ultimoComprobante.fecha}</p><p><strong>Cliente:</strong> {ultimoComprobante.cliente}</p><p><strong>Teléfono:</strong> {ultimoComprobante.telefono || "No informado"}</p><p><strong>Producto:</strong> {ultimoComprobante.producto}</p><p><strong>Método:</strong> {ultimoComprobante.metodo}</p><p><strong>Total:</strong> {formatearPrecio(ultimoComprobante.total)}</p><p><strong>Abonó:</strong> {formatearPrecio(ultimoComprobante.montoEntregado || ultimoComprobante.total)}</p><p><strong>Debe:</strong> {formatearPrecio(ultimoComprobante.deudaGenerada || 0)}</p><p><strong>Casco pendiente:</strong> {ultimoComprobante.cascoPendiente ? "Sí" : "No"}</p></div></CardContent></Card>}
              </div>
            )}

            {pantallaCliente === "saldar" && (
              <Card className="rounded-3xl shadow-xl"><CardContent className="p-8 space-y-5"><h2 className="text-2xl font-bold">Saldar cuenta</h2><div className="flex gap-3"><Input placeholder="Ingresar nombre del cliente" value={clienteConsulta} onChange={(e) => setClienteConsulta(e.target.value)} className="rounded-2xl" /><Button className="rounded-2xl" onClick={buscarCliente}><Search className="w-4 h-4 mr-2" />Buscar</Button></div>{resultadoCliente && <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3"><p><strong>Cliente:</strong> {resultadoCliente.nombre}</p><p><strong>Teléfono:</strong> {resultadoCliente.telefono}</p><p><strong>Deuda:</strong> {formatearPrecio(resultadoCliente.deudaDinero)}</p><p><strong>Baterías viejas pendientes:</strong> {resultadoCliente.bateriasViejas}</p><div><p className="font-semibold mb-2">Historial:</p><ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">{resultadoCliente.historial?.length ? resultadoCliente.historial.map((item, idx) => <li key={idx}>{item}</li>) : <li>Sin movimientos</li>}</ul></div><Button className="rounded-2xl" onClick={saldarCuenta}>Marcar cuenta saldada</Button></div>}</CardContent></Card>
            )}
          </div>
        )}

        {vista === "admin" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-2xl" onClick={() => setVista("inicio")}>Salir</Button>
              {['dashboard','productos','ventas','clientes','stock'].map((item) => <Button key={item} className="rounded-2xl" variant={pantallaAdmin === item ? 'default' : 'outline'} onClick={() => setPantallaAdmin(item)}>{item.charAt(0).toUpperCase()+item.slice(1)}</Button>)}
            </div>

            {pantallaAdmin === 'dashboard' && <div className="space-y-6"><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6"><Card><CardContent className="p-6"><p className="text-slate-500">Ventas registradas</p><h3 className="text-3xl font-bold">{ventas.length}</h3></CardContent></Card><Card><CardContent className="p-6"><p className="text-slate-500">Facturación del día</p><h3 className="text-3xl font-bold">{formatearPrecio(ventasHoyImporte)}</h3></CardContent></Card><Card><CardContent className="p-6"><p className="text-slate-500">Deuda total</p><h3 className="text-3xl font-bold">{formatearPrecio(deudaTotal)}</h3></CardContent></Card><Card><CardContent className="p-6"><p className="text-slate-500">Cascos pendientes</p><h3 className="text-3xl font-bold">{cascosPendientes}</h3></CardContent></Card></div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6"><Card><CardContent className="p-6"><p className="text-slate-500">Ventas del día</p><h3 className="text-3xl font-bold">{ventasDelDia.length}</h3></CardContent></Card><Card><CardContent className="p-6"><p className="text-slate-500">Ventas a cuenta hoy</p><h3 className="text-3xl font-bold">{ventasACuentaHoy}</h3></CardContent></Card><Card><CardContent className="p-6"><p className="text-slate-500">Deuda generada hoy</p><h3 className="text-3xl font-bold">{formatearPrecio(deudaGeneradaHoy)}</h3></CardContent></Card><Card><CardContent className="p-6"><p className="text-slate-500">Clientes con deuda</p><h3 className="text-3xl font-bold">{clientesConDeuda}</h3><p className="text-sm text-slate-500 mt-2">Cascos pendientes: {clientesConCascoPendiente}</p></CardContent></Card></div><Card><CardContent className="p-8"><h2 className="text-2xl font-bold mb-6">Caja del día</h2><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm"><div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">Efectivo: <strong>{formatearPrecio(resumenCajaHoy["Efectivo"])}</strong></div><div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">Débito: <strong>{formatearPrecio(resumenCajaHoy["Débito"])}</strong></div><div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">Transferencia: <strong>{formatearPrecio(resumenCajaHoy["Transferencia"])}</strong></div><div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">3 cuotas: <strong>{formatearPrecio(resumenCajaHoy["3 cuotas"])}</strong></div><div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">6 cuotas: <strong>{formatearPrecio(resumenCajaHoy["6 cuotas"])}</strong></div><div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">Total ingresado hoy: <strong>{formatearPrecio(resumenCajaHoy.total)}</strong></div></div></CardContent></Card></div>}

            {pantallaAdmin === 'productos' && <Card><CardContent className="p-8"><h2 className="text-2xl font-bold mb-6">Administrar productos</h2><div className="grid md:grid-cols-4 gap-3 mb-6"><Input placeholder="Nombre" value={nuevoProducto.nombre} onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} className="rounded-2xl" /><Input placeholder="Precio" type="number" value={nuevoProducto.precio} onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })} className="rounded-2xl" /><Input placeholder="Stock" type="number" value={nuevoProducto.stock} onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })} className="rounded-2xl" /><Input placeholder="Casco" type="number" value={nuevoProducto.casco} onChange={(e) => setNuevoProducto({ ...nuevoProducto, casco: e.target.value })} className="rounded-2xl" /></div><div className="flex flex-wrap gap-3 mb-6"><Button className="rounded-2xl" onClick={agregarProducto}>Agregar producto</Button><Button variant="destructive" className="rounded-2xl" onClick={reiniciarSistema}>Reiniciar sistema</Button></div><div className="space-y-3">{productos.map((p) => <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">{productoEditandoId === p.id ? <div className="grid md:grid-cols-4 gap-3"><Input value={productoEditado.nombre} onChange={(e) => setProductoEditado({ ...productoEditado, nombre: e.target.value })} className="rounded-2xl" /><Input type="number" value={productoEditado.precio} onChange={(e) => setProductoEditado({ ...productoEditado, precio: e.target.value })} className="rounded-2xl" /><Input type="number" value={productoEditado.stock} onChange={(e) => setProductoEditado({ ...productoEditado, stock: e.target.value })} className="rounded-2xl" /><Input type="number" value={productoEditado.casco} onChange={(e) => setProductoEditado({ ...productoEditado, casco: e.target.value })} className="rounded-2xl" /><div className="md:col-span-4 flex gap-3"><Button className="rounded-2xl" onClick={guardarEdicionProducto}>Guardar cambios</Button><Button variant="outline" className="rounded-2xl" onClick={() => setProductoEditandoId(null)}>Cancelar</Button></div></div> : <div className="flex items-center justify-between"><div><p className="font-semibold">{p.nombre}</p><p className="text-sm text-slate-600">{formatearPrecio(p.precio)} · Stock {p.stock} · Casco {formatearPrecio(p.casco)}</p></div><div className="flex gap-2"><Button variant="outline" className="rounded-2xl" onClick={() => iniciarEdicionProducto(p)}><Pencil className="w-4 h-4 mr-2" />Editar</Button><Button variant="destructive" className="rounded-2xl" onClick={() => eliminarProducto(p.id)}><Trash2 className="w-4 h-4 mr-2" />Eliminar</Button></div></div>}</div>)}</div></CardContent></Card>}

            {pantallaAdmin === 'ventas' && <Card><CardContent className="p-8"><h2 className="text-2xl font-bold mb-6">Historial de ventas</h2><div className="flex flex-col md:flex-row gap-3 mb-6"><Input placeholder="Buscar por cliente, producto u orden" value={filtroVentas} onChange={(e) => setFiltroVentas(e.target.value)} className="rounded-2xl" /><label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3"><input type="checkbox" checked={soloHoy} onChange={() => setSoloHoy(!soloHoy)} />Solo hoy</label></div><div className="space-y-3">{ventasFiltradas.length ? ventasFiltradas.map((v) => <div key={v.orden} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between"><div><p className="font-semibold">{v.orden} · {v.producto}</p><p className="text-sm text-slate-600">{v.fecha} · {v.cliente} · {v.metodo}</p><p className="font-bold text-emerald-700">{formatearPrecio(v.total)}</p></div><Button variant="destructive" className="rounded-2xl" onClick={() => anularVenta(v.orden)}>Anular</Button></div>) : <p>No hay ventas registradas.</p>}</div></CardContent></Card>}

            {pantallaAdmin === 'clientes' && <Card><CardContent className="p-8"><h2 className="text-2xl font-bold mb-6">Clientes</h2><div className="space-y-3">{Object.entries(clientes).map(([nombre, data]) => <div key={nombre} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">{clienteEditando === nombre ? <div className="grid md:grid-cols-2 gap-3"><Input value={clienteEditado.nombre} onChange={(e) => setClienteEditado({ ...clienteEditado, nombre: e.target.value })} className="rounded-2xl" /><Input value={clienteEditado.telefono} onChange={(e) => setClienteEditado({ ...clienteEditado, telefono: e.target.value })} className="rounded-2xl" /><Input type="number" value={clienteEditado.deudaDinero} onChange={(e) => setClienteEditado({ ...clienteEditado, deudaDinero: e.target.value })} className="rounded-2xl" /><Input type="number" value={clienteEditado.bateriasViejas} onChange={(e) => setClienteEditado({ ...clienteEditado, bateriasViejas: e.target.value })} className="rounded-2xl" /><div className="md:col-span-2 flex gap-3"><Button className="rounded-2xl" onClick={() => guardarEdicionCliente(nombre)}>Guardar</Button><Button variant="outline" className="rounded-2xl" onClick={() => setClienteEditando(null)}>Cancelar</Button></div></div> : <div className="flex items-center justify-between"><div><p className="font-semibold">{nombre}</p><p className="text-sm text-slate-600">Tel: {data.telefono}</p><p>Deuda: {formatearPrecio(data.deudaDinero)} · Cascos: {data.bateriasViejas}</p></div><Button variant="outline" className="rounded-2xl" onClick={() => iniciarEdicionCliente(nombre, data)}><Pencil className="w-4 h-4 mr-2" />Editar</Button></div>}</div>)}</div></CardContent></Card>}

            {pantallaAdmin === 'stock' && <Card><CardContent className="p-8"><h2 className="text-2xl font-bold mb-6">Stock actual</h2><div className="space-y-3">{productos.map((p) => <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between"><span>{p.nombre}</span><span className={p.stock <= 2 ? "text-red-600 font-bold" : "text-slate-700"}>{p.stock} {p.stock <= 2 ? "· Bajo" : ""}</span></div>)}</div><div className="mt-8 border-t pt-6"><h3 className="text-xl font-bold mb-4">Seguridad administrador</h3><div className="flex flex-col md:flex-row gap-3"><Input type="password" placeholder="Nueva clave de administrador" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} className="rounded-2xl" /><Button className="rounded-2xl" onClick={cambiarClaveAdmin}><KeyRound className="w-4 h-4 mr-2" />Cambiar clave</Button></div></div></CardContent></Card>}
          </div>
        )}
      </div>
    </div>
  );
}
