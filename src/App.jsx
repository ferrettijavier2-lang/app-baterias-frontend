import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_ADMIN_PASSWORD = "1234";
const STORAGE_KEY = "baterias_app_data_v2";

const productosIniciales = [
  { id: 1, nombre: "JALIT-12X48", precio: 119000, stock: 9, casco: 6000 },
  { id: 2, nombre: "JALIT-12X50", precio: 129000, stock: 6, casco: 6000 },
];

const clientesIniciales = {
  "Juan Pérez": { telefono: "3462-111111", deudaDinero: 0, bateriasViejas: 0, historial: [] },
  "María Gómez": { telefono: "3462-222222", deudaDinero: 35000, bateriasViejas: 1, historial: ["Debe saldo anterior"] },
};

const metodosPago = ["Efectivo", "Débito", "3 cuotas", "6 cuotas", "Transferencia"];

const formatearPrecio = (valor) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor || 0);

export default function App() {
  const [vista, setVista] = useState("inicio");
  const [pantallaCliente, setPantallaCliente] = useState("inicio");
  const [adminPass, setAdminPass] = useState("");

  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState({});
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

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevoStock, setNuevoStock] = useState("");
  const [nuevoCasco, setNuevoCasco] = useState("");

  const [cobros, setCobros] = useState({});

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);

    if (guardado) {
      try {
        const data = JSON.parse(guardado);
        setProductos(data.productos || productosIniciales);
        setClientes(data.clientes || clientesIniciales);
        setVentas(data.ventas || []);
      } catch (e) {
        console.error("Error cargando datos guardados", e);
        setProductos(productosIniciales);
        setClientes(clientesIniciales);
        setVentas([]);
      }
    } else {
      setProductos(productosIniciales);
      setClientes(clientesIniciales);
      setVentas([]);
    }
  }, []);

  useEffect(() => {
    if (productos.length === 0 && Object.keys(clientes).length === 0 && ventas.length === 0) return;

    const payload = { productos, clientes, ventas };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [productos, clientes, ventas]);

  const numeroOrden = useMemo(
    () => `ORD-${Date.now().toString().slice(-6)}`,
    [productoSeleccionado, clienteCompra]
  );

  const precioBase = productoSeleccionado
    ? productoSeleccionado.precio + (entregaCasco ? 0 : productoSeleccionado.casco)
    : 0;

  const porcentajeRecargo =
    metodoSeleccionado === "3 cuotas" ? 15 : metodoSeleccionado === "6 cuotas" ? 30 : 0;

  const totalFinal = precioBase + precioBase * (porcentajeRecargo / 100);

  const valorCuota =
    metodoSeleccionado === "3 cuotas"
      ? totalFinal / 3
      : metodoSeleccionado === "6 cuotas"
      ? totalFinal / 6
      : 0;

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
      setVista("admin");
      setAdminPass("");
    } else {
      alert("Clave incorrecta");
    }
  };

  const seleccionarProducto = (producto) => {
    if (producto.stock <= 0) {
      alert("No hay stock disponible.");
      return;
    }
    setProductoSeleccionado(producto);
    setPantallaCliente("comprar");
  };

  const confirmarVenta = () => {
    if (!productoSeleccionado || !clienteCompra || !metodoSeleccionado) {
      alert("Completá cliente, producto y método de pago.");
      return;
    }

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
      deudaGenerada,
      telefono: telefonoCompra,
    };

    setVentas((prev) => [nuevaVenta, ...prev]);

    setProductos((prev) =>
      prev.map((item) =>
        item.id === productoSeleccionado.id
          ? { ...item, stock: Math.max(item.stock - 1, 0) }
          : item
      )
    );

    setClientes((prev) => {
      const existente =
        prev[clienteCompra] || {
          deudaDinero: 0,
          bateriasViejas: 0,
          telefono: telefonoCompra || "No informado",
          historial: [],
        };

      return {
        ...prev,
        [clienteCompra]: {
          ...existente,
          telefono: telefonoCompra || existente.telefono,
          deudaDinero: existente.deudaDinero + deudaGenerada,
          bateriasViejas: existente.bateriasViejas + (!entregaCasco ? 1 : 0),
          historial: [
            `${nuevaVenta.orden} · ${nuevaVenta.fecha} · ${productoSeleccionado.nombre} · ${metodoSeleccionado} · ${formatearPrecio(totalFinal)}`,
            ...existente.historial,
          ],
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

  const agregarProducto = () => {
    if (!nuevoNombre || !nuevoPrecio || !nuevoStock || !nuevoCasco) {
      alert("Completá todos los campos del producto.");
      return;
    }

    const nuevoProducto = {
      id: Date.now(),
      nombre: nuevoNombre,
      precio: Number(nuevoPrecio),
      stock: Number(nuevoStock),
      casco: Number(nuevoCasco),
    };

    setProductos((prev) => [...prev, nuevoProducto]);
    setNuevoNombre("");
    setNuevoPrecio("");
    setNuevoStock("");
    setNuevoCasco("");
    alert("Producto agregado y guardado.");
  };

  const editarProducto = (id, campo, valor) => {
    setProductos((prev) =>
      prev.map((producto) =>
        producto.id === id
          ? {
              ...producto,
              [campo]: campo === "nombre" ? valor : Number(valor),
            }
          : producto
      )
    );
  };

  const eliminarProducto = (id) => {
    const confirmar = window.confirm("¿Seguro que querés eliminar este producto?");
    if (!confirmar) return;
    setProductos((prev) => prev.filter((producto) => producto.id !== id));
  };

  const actualizarCobro = (clienteNombre, campo, valor) => {
    setCobros((prev) => ({
      ...prev,
      [clienteNombre]: {
        ...prev[clienteNombre],
        [campo]: valor,
      },
    }));
  };

  const aplicarCobro = (clienteNombre) => {
    const cliente = clientes[clienteNombre];
    const cobro = cobros[clienteNombre] || {};
    const pagoDinero = Number(cobro.pagoDinero || 0);
    const entregaViejas = Number(cobro.entregaViejas || 0);

    const nuevaDeuda = Math.max(cliente.deudaDinero - pagoDinero, 0);
    const nuevasViejas = Math.max(cliente.bateriasViejas - entregaViejas, 0);

    setClientes((prev) => ({
      ...prev,
      [clienteNombre]: {
        ...prev[clienteNombre],
        deudaDinero: nuevaDeuda,
        bateriasViejas: nuevasViejas,
        historial: [
          `Cobro aplicado · ${new Date().toLocaleString("es-AR")} · Pago: ${formatearPrecio(pagoDinero)} · Baterías entregadas: ${entregaViejas}`,
          ...(prev[clienteNombre].historial || []),
        ],
      },
    }));

    setCobros((prev) => ({
      ...prev,
      [clienteNombre]: { pagoDinero: "", entregaViejas: "" },
    }));

    alert("Cobro aplicado correctamente.");
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
              <input
                type="password"
                placeholder="Clave"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }}
              />
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

                <input placeholder="Nombre del cliente" value={clienteCompra} onChange={(e) => setClienteCompra(e.target.value)} style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }} />
                <input placeholder="Teléfono" value={telefonoCompra} onChange={(e) => setTelefonoCompra(e.target.value)} style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }} />

                <p><strong>Producto:</strong> {productoSeleccionado.nombre}</p>
                <p><strong>Precio:</strong> {formatearPrecio(productoSeleccionado.precio)}</p>
                <p><strong>Orden:</strong> {numeroOrden}</p>

                <label style={{ display: "block", marginBottom: 10 }}>
                  <input type="checkbox" checked={entregaCasco} onChange={() => setEntregaCasco(!entregaCasco)} /> Entrega batería vieja
                </label>

                <label style={{ display: "block", marginBottom: 10 }}>
                  <input type="checkbox" checked={ventaACuenta} onChange={() => setVentaACuenta(!ventaACuenta)} /> Venta a cuenta
                </label>

                {ventaACuenta && (
                  <input type="number" placeholder="Monto entregado" value={montoEntregado} onChange={(e) => setMontoEntregado(e.target.value)} style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }} />
                )}

                <h3>Métodos de pago</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 }}>
                  {metodosPago.map((metodo) => (
                    <button key={metodo} onClick={() => setMetodoSeleccionado(metodo)}>{metodo}</button>
                  ))}
                </div>

                <p><strong>Total final:</strong> {formatearPrecio(totalFinal)}</p>
                {valorCuota > 0 && <p><strong>Valor por cuota:</strong> {formatearPrecio(valorCuota)}</p>}

                <button onClick={confirmarVenta}>Confirmar venta</button>
              </div>
            )}

            {pantallaCliente === "saldar" && (
              <div style={{ marginTop: 20, background: "white", padding: 30, borderRadius: 20 }}>
                <h2>Saldar cuenta</h2>

                <input placeholder="Ingresar nombre del cliente" value={clienteConsulta} onChange={(e) => setClienteConsulta(e.target.value)} style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }} />

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

        {vista === "admin" && (
          <div style={{ marginTop: 30 }}>
            <button onClick={() => setVista("inicio")}>Volver</button>

            <div style={{ marginTop: 20, background: "white", padding: 30, borderRadius: 20 }}>
              <h2>Panel de Administrador</h2>

              <div style={{ marginTop: 30, marginBottom: 40, padding: 20, background: "#f8fafc", borderRadius: 20 }}>
                <h3>Agregar nuevo producto</h3>

                <input placeholder="Nombre" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }} />
                <input type="number" placeholder="Precio" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }} />
                <input type="number" placeholder="Stock" value={nuevoStock} onChange={(e) => setNuevoStock(e.target.value)} style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }} />
                <input type="number" placeholder="Casco" value={nuevoCasco} onChange={(e) => setNuevoCasco(e.target.value)} style={{ display: "block", marginBottom: 10, padding: 10, width: "100%" }} />

                <button onClick={agregarProducto}>Agregar producto</button>
              </div>

              <div style={{ marginTop: 20 }}>
                <h3>Editar productos</h3>

                {productos.map((producto) => (
                  <div key={producto.id} style={{ padding: 15, borderBottom: "1px solid #ddd", marginBottom: 10 }}>
                    <input value={producto.nombre} onChange={(e) => editarProducto(producto.id, "nombre", e.target.value)} style={{ display: "block", marginBottom: 8, padding: 10, width: "100%" }} />
                    <input type="number" value={producto.precio} onChange={(e) => editarProducto(producto.id, "precio", e.target.value)} style={{ display: "block", marginBottom: 8, padding: 10, width: "100%" }} />
                    <input type="number" value={producto.stock} onChange={(e) => editarProducto(producto.id, "stock", e.target.value)} style={{ display: "block", marginBottom: 8, padding: 10, width: "100%" }} />
                    <input type="number" value={producto.casco} onChange={(e) => editarProducto(producto.id, "casco", e.target.value)} style={{ display: "block", marginBottom: 8, padding: 10, width: "100%" }} />
                    <button onClick={() => eliminarProducto(producto.id)}>Eliminar producto</button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 30 }}>
                <h3>Clientes / Cobro de deuda</h3>
                {Object.entries(clientes).map(([nombre, cliente], index) => (
                  <div key={index} style={{ padding: 15, borderBottom: "1px solid #ddd", marginBottom: 10 }}>
                    <p><strong>{nombre}</strong></p>
                    <p>Tel: {cliente.telefono}</p>
                    <p>Deuda: {formatearPrecio(cliente.deudaDinero)}</p>
                    <p>Baterías viejas: {cliente.bateriasViejas}</p>

                    <input
                      type="number"
                      placeholder="Cuánto pagó"
                      value={cobros[nombre]?.pagoDinero || ""}
                      onChange={(e) => actualizarCobro(nombre, "pagoDinero", e.target.value)}
                      style={{ display: "block", marginBottom: 8, padding: 10, width: "100%" }}
                    />

                    <input
                      type="number"
                      placeholder="Cuántas baterías viejas entregó"
                      value={cobros[nombre]?.entregaViejas || ""}
                      onChange={(e) => actualizarCobro(nombre, "entregaViejas", e.target.value)}
                      style={{ display: "block", marginBottom: 8, padding: 10, width: "100%" }}
                    />

                    <button onClick={() => aplicarCobro(nombre)}>Aplicar cobro</button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 30 }}>
                <h3>Ventas</h3>
                {ventas.length === 0 ? (
                  <p>No hay ventas registradas.</p>
                ) : (
                  ventas.map((venta, index) => (
                    <div key={index} style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                      <strong>{venta.orden}</strong> — {venta.cliente} — {venta.producto} — {formatearPrecio(venta.total)} — {venta.metodo}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
