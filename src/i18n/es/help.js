// Help: the help window, the guided tour and the help texts (src/ui/help/). The bodies are HTML with the tokens
// described in src/ui/help/help.js ([[t:key]], [[eq:id]], [[icon:type]], [[go:…]], [[show:…]], [[act:…]]).
PumpIt.i18n.add('es', {
  help: {
    title: 'Ayuda de Pump It',
    search: 'Buscar en la ayuda…',
    contents: 'Contenido de la ayuda',
    found: '{n} sección(es) encontrada(s)',
    noMatch: 'No se encontró nada. Pruebe otra palabra.',
    prev: 'Anterior',
    next: 'Siguiente',
    close: 'Cerrar la ayuda',
    tourButton: 'Recorrido guiado',

    offer: {
      title: '¿Primera vez aquí?',
      body: 'Haga un recorrido de un minuto por la pantalla, o abra la ayuda cuando quiera (F1).',
      tour: 'Hacer el recorrido',
      help: 'Abrir la ayuda',
      later: 'Ahora no',
    },

    tour: {
      step: 'Paso {n} de {total}',
      next: 'Siguiente',
      back: 'Atrás',
      done: 'Terminar',
      close: 'Salir del recorrido',
      steps: {
        menus: {
          title: 'Menús',
          body: 'En [[t:app.menu.file]] usted crea, abre, descarga y exporta modelos, y encuentra los ejemplos listos. En [[t:app.menu.edit]] están deshacer, copiar, pegar, eliminar y la cuadrícula. En [[t:app.menu.help]] están este recorrido, el centro de ayuda y la referencia técnica.',
        },
        title: {
          title: 'Título del modelo',
          body: 'Haga clic para dar un nombre al modelo. Ese nombre también da nombre al archivo cuando descarga el modelo.',
        },
        stamp: {
          title: 'Régimen del cálculo',
          body: 'Muestra si el modelo es de líquido (incompresible) o de gas (compresible) y, en el gas, el modelo térmico y el gas. Un clic abre la ventana de las propiedades del sistema, donde se cambia el régimen.',
        },
        scenario: {
          title: 'Escenarios',
          body: 'Elija el escenario que está en pantalla. El botón <b>+</b> crea un escenario hijo del actual (por ejemplo, la bomba al 90% de la velocidad); los otros cambian el nombre y eliminan. Cada escenario guarda solo lo que cambia respecto a su padre.',
        },
        status: {
          title: 'Estado del cálculo',
          body: 'No hay botón de calcular: el modelo se recalcula en cada cambio. Este indicador muestra si falta algo (pendientes), si el cálculo convergió o si fue rechazado. Haga clic en él para ver la lista de verificación e ir directo al objeto incompleto.',
        },
        language: {
          title: 'Idioma',
          body: 'Cambia toda la interfaz entre portugués, inglés y español, al instante. Los nombres que usted escribió no se traducen.',
        },
        theme: {
          title: 'Modo claro u oscuro',
          body: 'El sol y la luna alternan la pantalla entre el modo claro y el oscuro. Sin una elección, la aplicación sigue el modo del sistema; la elección se guarda en este navegador.',
        },
        tabs: {
          title: 'Pestañas',
          body: '[[t:app.tabs.net]] es donde se dibuja. [[t:app.tabs.data]] lista las entradas en tablas; [[t:app.tabs.out]] trae caudales, presiones y avisos (el número de la pestaña cuenta los avisos); [[t:app.tabs.charts]] muestra la bomba frente al sistema y el perfil de las líneas de carga.',
        },
        palette: {
          title: 'Paleta',
          body: '[[t:network.palette.select]] (tecla <kbd>V</kbd>) y [[t:network.palette.pipe]] (tecla <kbd>P</kbd>) son las herramientas. Debajo vienen los tipos de unión, en grupos. Arrastre un tipo al dibujo, o haga clic en él y luego en el dibujo. La flecha en su borde derecho contrae la paleta y devuelve el espacio al dibujo; otro clic la trae de vuelta.',
        },
        canvas: {
          title: 'Área de dibujo',
          body: 'Haga clic para seleccionar y arrastre una unión para moverla. Arrastre el fondo para mover la vista y use la rueda del ratón para acercar. El clic derecho sobre un objeto muestra sus datos y algunas acciones.',
        },
        views: {
          title: 'Vistas',
          body: 'Alterne entre el esquema 2D y la vista 3D (teclas <kbd>1</kbd> y <kbd>2</kbd>). Las dos muestran el mismo modelo: la altura de cada unión es su cota. La flecha junto a 3D abre las opciones de esa vista, y otro clic las contrae; en 3D, el cubo de la esquina superior derecha elige desde qué lado mirar.',
        },
        overlay: {
          title: 'Resultados en el dibujo',
          body: 'Coloree las tuberías por caudal, velocidad, caída de presión, presión estática o línea piezométrica. Una leyenda con la escala aparece en la esquina.',
        },
        zoom: {
          title: 'Zoom',
          body: 'Aleje, encuadre todo el dibujo o acerque. La rueda del ratón y las teclas <kbd>+</kbd>, <kbd>−</kbd> e <kbd>Inicio</kbd> hacen lo mismo.',
        },
        inspector: {
          title: 'Propiedades',
          body: 'Muestra y edita el objeto seleccionado: se abre cuando selecciona algo y se contrae cuando no hay nada seleccionado. Abierto por su flecha sin nada seleccionado, resume el sistema y trae el botón que abre la ventana de las propiedades del sistema. Lo que le falta a un objeto aparece en un recuadro rojo; la <b>i</b> junto a un campo muestra una nota sobre él cuando el ratón pasa por encima.',
        },
        panel: {
          title: 'Contraer el panel',
          body: 'La flecha contrae el panel de propiedades y devuelve el espacio al dibujo, o trae el panel de vuelta, hasta que la selección cambie de nuevo.',
        },
        help: {
          title: 'Ayuda',
          body: 'Vuelva aquí siempre que lo necesite. El centro de ayuda (<kbd>F1</kbd>) explica cada parte de la aplicación y trae la referencia técnica del cálculo, con las ecuaciones que usa.',
        },
      },
    },

    chapters: {
      start: {
        title: 'Primeros pasos',
        sections: {
          welcome: {
            title: 'Bienvenida',
            body: `<p><b>Pump It</b> calcula redes de tuberías en <b>régimen permanente</b>, de líquidos (flujo incompresible) y de gases ([[go:gas.concept|modo compresible]]). Usted dibuja la red — tuberías y uniones, como reservorios, bombas y válvulas —, completa los datos, y el programa encuentra los caudales y las presiones en todos los puntos.</p>
<p>No hay botón de calcular: <b>cada cambio recalcula el modelo</b>, siempre que los datos necesarios estén completos. Los resultados aparecen en tablas, en gráficos, en la tarjeta de datos de cada objeto (clic derecho) y en el propio dibujo.</p>
<h4>Cómo está organizada esta ayuda</h4>
<ul>
<li><b>Primeros pasos</b>: arme un modelo desde cero y entienda el cálculo automático.</li>
<li><b>Guía de uso</b>, capítulos 2 a 11: la pantalla, el dibujo, cada tipo de unión, las tuberías, el sistema, los escenarios, los resultados, los gráficos, la vista 3D y los archivos.</li>
<li><b>Referencia técnica</b>: las hipótesis, el método de solución y las ecuaciones de cada componente.</li>
</ul>
<p>Use el buscador de arriba para encontrar un tema, y los botones <b>Anterior</b> y <b>Siguiente</b> para leer en orden. Los botones punteados, como [[show:palette|la paleta]], resaltan la parte de la pantalla de la que habla el texto.</p>
<p>[[act:tour|Hacer el recorrido guiado por la pantalla]]</p>`,
          },
          firstModel: {
            title: 'Su primer modelo',
            body: `<p>Vamos a armar una bomba que lleva agua de un tanque bajo a un tanque elevado. Toma unos cinco minutos.</p>
<ol class="steps">
<li><b>Empiece desde cero.</b> Abra el menú [[t:app.menu.file]] y elija [[t:app.menu.new]]. El modelo actual se recupera con <kbd>Ctrl</kbd>+<kbd>Z</kbd>.</li>
<li><b>Coloque las uniones.</b> Desde la [[show:palette|paleta]], arrastre [[icon:reservoir]] [[t:junctions.reservoir.label]] a la izquierda del dibujo, [[icon:pump]] [[t:junctions.pump.label]] al centro y otro [[t:junctions.reservoir.label]] a la derecha.</li>
<li><b>Una las tuberías.</b> Elija la herramienta [[t:network.palette.pipe]] (tecla <kbd>P</kbd>) y haga clic en el primer reservorio, luego en la bomba y luego en el segundo reservorio. Pulse <kbd>Esc</kbd> para terminar. Cada tubería apunta de la unión pulsada primero a la segunda, y la bomba necesita una tubería que llega (succión) y otra que sale (impulsión).</li>
<li><b>Describa el tanque elevado.</b> Haga clic en el reservorio de la derecha y, en el panel [[show:inspector|Propiedades]], cambie [[t:junctions.reservoir.elevation]] a 27 m y [[t:junctions.reservoir.form.liquidElev]] a 30 m. La bomba ya trae una curva de ejemplo, y las tuberías, 100 m de acero al carbono de 4" Sch 40.</li>
<li><b>Vea el resultado.</b> Cuando ya no falta nada, el [[show:status|indicador]] de arriba cambia a [[t:app.status.calculated]]. Haga clic derecho en una tubería para ver su caudal, velocidad y pérdida de carga, o seleccione la bomba para ver su altura y potencia en el panel.</li>
<li><b>Explore.</b> En [[show:overlay|Resultados en el dibujo]], elija [[t:network.overlay.V]] para colorear las tuberías. Abra la pestaña [[t:app.tabs.out]] para las tablas y la pestaña [[t:app.tabs.charts]] para ver la curva de la bomba frente a la del sistema.</li>
</ol>
<p class="tip"><b>Consejo:</b> si falta algo, el indicador muestra cuántos pendientes hay. Haga clic en él: la lista lleva directo al objeto incompleto, y el panel muestra en rojo lo que falta completar.</p>
<p>Próximos pasos: pruebe un [[go:start.examples|ejemplo listo]], cree un [[go:scenarios.concept|escenario]] con la bomba al 90% de la velocidad, o vea la red en la [[go:views3d.concept|vista 3D]].</p>`,
          },
          examples: {
            title: 'Ejemplos listos',
            body: `<p>El menú [[t:app.menu.file]] → [[t:app.menu.examples]] abre modelos completos, listos para explorar. Abrir un ejemplo reemplaza el modelo de la pantalla, pero <kbd>Ctrl</kbd>+<kbd>Z</kbd> trae el suyo de vuelta. Los botones de abajo abren cada uno:</p>
<table>
<tr><th>Ejemplo</th><th>Qué muestra</th></tr>
<tr><td>[[act:example:pump]]</td><td>Una bomba entre un tanque de succión y un tanque elevado, con válvula de compuerta en la impulsión. El escenario hijo hace girar la bomba al 90% de la velocidad.</td></tr>
<tr><td>[[act:example:exit]]</td><td>Impulsión hasta un punto de entrega con presión residual, modelada con una válvula de salida.</td></tr>
<tr><td>[[act:example:gravity]]</td><td>Flujo por gravedad de una represa a un tanque, a través de una válvula.</td></tr>
<tr><td>[[act:example:threeRes]]</td><td>El problema clásico de los tres reservorios unidos en un nudo.</td></tr>
<tr><td>[[act:example:loop]]</td><td>Una red mallada de distribución con consumos en los nudos y fricción de Hazen-Williams.</td></tr>
<tr><td>[[act:example:prv]]</td><td>Una válvula reductora de presión que alimenta un consumo. En el escenario de punta, la presión aguas arriba no alcanza y la válvula abre totalmente.</td></tr>
<tr><td>[[act:example:sprinkler]]</td><td>Un ramal de aspersores alimentado por una presión impuesta.</td></tr>
</table>
<p>Un ejemplo que usted todavía no modificó se rehace en el nuevo idioma cuando cambia la lengua de la interfaz.</p>`,
          },
          autoCalc: {
            title: 'Cálculo automático',
            body: `<p>Pump It recalcula el escenario actual en cada cambio. Para eso, el modelo debe estar completo — es lo que comprueba la <b>lista de verificación</b>.</p>
<h4>El indicador de arriba</h4>
<ul>
<li><span class="dot bad"></span> <b>N pendiente(s)</b>: todavía falta algo. Haga clic en el indicador para ver la lista; cada objeto incompleto es un enlace que lo selecciona.</li>
<li><span class="dot ok"></span> [[t:app.status.calculated]]: el cálculo convergió y los resultados están al día.</li>
<li><span class="dot warn"></span> [[t:app.status.notConverged]]: el solver llegó al límite de iteraciones. Los números solo sirven para diagnóstico; vea [[go:system.solution|Control de la solución]].</li>
<li><span class="dot bad"></span> [[t:app.status.refused]]: los datos están completos, pero la red no se puede resolver — por ejemplo, un tramo sin referencia de presión. El mensaje aparece en la lista y en la línea de estado.</li>
</ul>
<h4>Qué comprueba la lista</h4>
<ul>
<li>[[t:core.checklist.items.solution]]: tolerancia, iteraciones y relajación válidas.</li>
<li>[[t:core.checklist.items.system]]: el fluido definido.</li>
<li>[[t:core.checklist.items.pipes]] y [[t:core.checklist.items.junctions]]: cada objeto con sus datos y con el número correcto de tuberías unidas.</li>
</ul>
<p>En un objeto incompleto, el panel [[show:inspector|Propiedades]] muestra el recuadro <b>Indefinido</b> con lo que falta, y el objeto lleva un contorno rojo punteado en el dibujo.</p>
<p>A la derecha de las pestañas, la [[show:statusLine|línea de estado]] informa cuántas iteraciones llevó el cálculo y cuánto tardó. Al cambiar de escenario, el nuevo se calcula en el acto.</p>`,
          },
          saving: {
            title: 'Su trabajo queda guardado',
            body: `<p>Cada cambio se graba automáticamente en el navegador: al abrir de nuevo Pump It en la misma computadora y en el mismo navegador, el último modelo vuelve a la pantalla.</p>
<p class="warn"><b>Atención:</b> esa copia automática vive solo en este navegador, y borrar los datos de navegación la elimina. Para guardar el trabajo de verdad, use [[t:app.menu.file]] → [[t:app.menu.save]] y guarde el archivo <code>.json</code>.</p>
<ul>
<li><b>Deshacer y rehacer:</b> <kbd>Ctrl</kbd>+<kbd>Z</kbd> y <kbd>Ctrl</kbd>+<kbd>Y</kbd>, o el menú [[t:app.menu.edit]]. La aplicación guarda los últimos 80 cambios. Mover la cámara de la vista 3D no entra en el historial.</li>
<li><b>Abrir un archivo:</b> [[t:app.menu.file]] → [[t:app.menu.open]].</li>
</ul>
<p>Más detalles en [[go:files.files|Archivos]].</p>`,
          },
        },
      },

      screen: {
        title: 'La pantalla',
        sections: {
          overview: {
            title: 'Visión general',
            body: `<p>La pantalla tiene cinco áreas. Haga clic en los botones para ver cada una resaltada:</p>
<ol>
<li>[[show:menus|Barra superior]]: menús, título del modelo, escenarios, estado del cálculo, idioma y modo claro u oscuro.</li>
<li>[[show:tabs|Pestañas]]: [[t:app.tabs.net]], [[t:app.tabs.data]], [[t:app.tabs.out]] y [[t:app.tabs.charts]].</li>
<li>[[show:palette|Paleta]], a la izquierda: las herramientas y los tipos de unión.</li>
<li>[[show:canvas|Área de dibujo]], en el centro: la red, las vistas, los resultados en el dibujo y el zoom.</li>
<li>[[show:inspector|Propiedades]], a la derecha: los datos del objeto seleccionado.</li>
</ol>
<p>La [[show:paletteToggle|flecha]] en el borde derecho de la paleta la contrae, y el dibujo gana el espacio; otro clic la trae de vuelta, y la elección se guarda en este navegador. El panel de propiedades se abre cuando algo está seleccionado y se contrae cuando no hay nada seleccionado; la [[show:panel|flecha]] en su borde izquierdo también lo contrae o lo trae de vuelta.</p>
<p>Para un paseo completo, con una explicación breve de cada parte, haga el [[act:tour|recorrido guiado]].</p>`,
          },
          topbar: {
            title: 'Barra superior',
            body: `<ul>
<li><b>Título</b>: haga clic en el nombre junto al logotipo para cambiar el nombre del modelo. El nombre también da nombre al archivo descargado.</li>
<li>[[t:app.menu.file]]: nuevo modelo, abrir, descargar, copiar y pegar el modelo como texto JSON, exportar los resultados a Excel y los ejemplos.</li>
<li>[[t:app.menu.edit]]: deshacer, rehacer, copiar, pegar, seleccionar todo, invertir el sentido de una tubería, eliminar, ajustar el dibujo a la pantalla y activar o desactivar la cuadrícula.</li>
<li>[[t:app.menu.help]]: este centro de ayuda, el recorrido guiado, la referencia técnica, los atajos de teclado e información sobre la aplicación.</li>
<li>[[t:app.scenario.label]]: la lista elige el escenario en pantalla; los botones de al lado crean un escenario hijo, cambian el nombre y eliminan. Vea [[go:scenarios.concept|Escenarios]].</li>
<li><b>Indicador de cálculo</b>: pendientes, convergencia y errores. Haga clic en él para ver la lista de verificación.</li>
<li><b>Idioma</b>: portugués, inglés o español.</li>
<li><b>Sol y luna</b>: alternan entre el modo claro y el oscuro. Sin una elección, la aplicación sigue el modo del sistema.</li>
</ul>`,
          },
          tabs: {
            title: 'Pestañas',
            body: `<ul>
<li>[[t:app.tabs.net]]: el dibujo y la edición de la red, con la paleta y el panel de propiedades.</li>
<li>[[t:app.tabs.data]]: las entradas del escenario actual en tablas de tuberías y uniones. Vea [[go:results.inputs|Datos del modelo]].</li>
<li>[[t:app.tabs.out]]: el resumen, las tablas de tuberías, uniones, bombas y válvulas, y los avisos. El número de la pestaña cuenta los avisos y se pone rojo cuando alguno es crítico.</li>
<li>[[t:app.tabs.charts]]: la bomba frente al sistema y el perfil de las líneas de carga.</li>
</ul>
<p>A la derecha de las pestañas está la línea de estado del cálculo.</p>`,
          },
          inspector: {
            title: 'Panel de propiedades',
            body: `<p>El panel de la derecha cambia según la selección:</p>
<ul>
<li><b>Nada seleccionado</b>: el panel se contrae. Abierto por su flecha, muestra un resumen del sistema y el botón [[t:inspector.system.open]], que abre la ventana [[t:inspector.system.title]] — régimen, fluido, ambiente, control de la solución y el escenario actual. Vea [[go:system.fluid|Sistema y solución]].</li>
<li><b>Una tubería</b>: resultados rápidos, nombre, geometría, fricción, accesorios y condición especial.</li>
<li><b>Una unión</b>: resultados rápidos, nombre, [[t:inspector.junction.type]], [[t:inspector.junction.elevation]] y los datos propios del tipo.</li>
<li><b>Varios objetos</b>: el recuento y las acciones de copiar, pegar y eliminar.</li>
</ul>
<h4>Campos</h4>
<ul>
<li>Escriba el valor y confirme con <kbd>Enter</kbd> o saliendo del campo. La coma o el punto sirven como separador decimal.</li>
<li>Junto a cada magnitud hay una lista de unidades. <b>Cambiar la unidad no convierte el número</b>: el valor pasa a leerse en la nueva unidad. Elija primero la unidad y escriba el valor en ella.</li>
<li>En un escenario hijo, un punto de color junto a la etiqueta indica un valor cambiado en este escenario. Haga clic en el punto para volver a heredar el valor del padre.</li>
<li>El recuadro rojo <b>Indefinido</b> lista lo que le falta al objeto para entrar en el cálculo.</li>
<li>Una <b>i</b> en un círculo, junto a un campo o al título de una sección, guarda una nota: pase el ratón sobre ella, o llegue a ella con <kbd>Tab</kbd>, para leerla.</li>
</ul>
<h4>Abrir y contraer el panel</h4>
<p>El panel se abre cuando selecciona algo, también con un clic en el objeto ya seleccionado, y se contrae cuando no hay nada seleccionado: tras un clic en un espacio vacío, una eliminación o la apertura de un modelo. Ir a un objeto desde la lista de verificación, las tablas o los avisos también lo abre. La [[show:panel|flecha]] en su borde izquierdo lo contrae, y el dibujo gana el espacio, o lo trae de vuelta; esto vale hasta que la selección cambie de nuevo.</p>
<p>El dibujo no se mueve cuando el panel se abre o se cierra. Cuando el panel cubriría el objeto recién seleccionado, el dibujo se desplaza para mostrarlo.</p>`,
          },
          units: {
            title: 'Unidades',
            body: `<p>Cada campo guarda el valor exactamente como se escribió, con su unidad, y el cálculo convierte todo al SI internamente. Las unidades predeterminadas son caudal en m³/h, longitud y cota en m, presión en kgf/cm²(g) y temperatura en °C; diámetros y rugosidad, en mm.</p>
<h4>Presión manométrica y absoluta</h4>
<p>Las unidades con <b>(g)</b> son manométricas, relativas a la presión ambiente; con <b>(a)</b>, absolutas. La conversión usa la [[t:inspector.system.patm]] del modelo:</p>
[[eq:gauge]]
<p>Las diferencias de presión (caída de presión, ΔP de ajuste) no llevan (g) ni (a).</p>
<h4>Unidades de los resultados</h4>
<p>En las tablas de resultados y en los gráficos, cada columna numérica tiene su propia lista de unidades en el encabezado. Allí, cambiar la unidad <b>convierte</b> los valores mostrados, sin recalcular, y la elección queda guardada. La ventana de columnas de las tablas de resultados ([[go:results.tables|Pestaña Resultados]]) también elige la unidad de cada columna, aparte para líquidos y gases.</p>
<p>Los números siguen el idioma: coma decimal en portugués y español, punto en inglés. Al escribir, se acepta cualquiera de los dos.</p>`,
          },
        },
      },

      draw: {
        title: 'Dibujar la red',
        sections: {
          place: {
            title: 'Colocar uniones',
            body: `<p>Hay dos formas de poner una unión en el dibujo:</p>
<ul>
<li><b>Arrastrar</b> el tipo desde la [[show:palette|paleta]] hasta el lugar deseado; o</li>
<li><b>Hacer clic</b> en el tipo y luego en el dibujo. Mantenga <kbd>Mayús</kbd> al hacer clic para seguir colocando el mismo tipo.</li>
</ul>
<p>Con la cuadrícula activa ([[t:app.menu.edit]] → [[t:app.menu.grid]]), las uniones se ajustan a los puntos de la cuadrícula. La unión nueva queda seleccionada, lista para recibir sus datos en el panel.</p>
<p>La posición en el esquema <b>no</b> entra en el cálculo: valen los datos, como la [[t:inspector.junction.elevation]] de cada unión y la longitud de cada tubería.</p>
<p>Para conocer cada tipo, vea [[go:junctions.overview|Tipos de unión]].</p>`,
          },
          pipes: {
            title: 'Dibujar tuberías',
            body: `<ol class="steps">
<li>Elija la herramienta [[t:network.palette.pipe]] en la paleta, o pulse <kbd>P</kbd>.</li>
<li>Haga clic en una unión (queda resaltada) y luego en otra: la tubería se crea entre las dos.</li>
<li>Siga haciendo clic para dibujar en cadena: cada clic une la última unión con la siguiente.</li>
<li>Haga clic en un punto vacío para crear allí un [[icon:branch]] [[t:junctions.branch.label]] y unirlo.</li>
<li>Pulse <kbd>Esc</kbd> para soltar la última unión; otra vez, para salir de la herramienta.</li>
</ol>
<h4>Datos de una tubería nueva</h4>
<p>La tubería nueva copia la longitud, el material, la sección y la fricción de la tubería seleccionada o, si no hay ninguna seleccionada, de la última creada. La primera tubería de un modelo nace con 100 m de acero al carbono de 4" Sch 40. La longitud dibujada <b>nunca</b> cuenta: escriba la longitud real en el panel.</p>
<h4>Sentido de referencia</h4>
<p>La tubería apunta de la unión pulsada primero a la segunda, como muestra la flecha del dibujo. Los caudales en el sentido de referencia son positivos; en contra, negativos. Después del cálculo, la flecha muestra el sentido real del flujo. Vea [[go:draw.direction|Sentido y signos]].</p>`,
          },
          connect: {
            title: 'Desconectar y reconectar tuberías',
            body: `<p>Una tubería puede cambiar de unión sin dibujarla de nuevo: conserva la longitud, el material, los accesorios y todos sus demás datos.</p>
<ul>
<li><b>Arrastrar un extremo</b>: seleccione la tubería y aparece un tirador en cada extremo. Arrastre el tirador hasta otra unión para unir allí ese extremo, o a un lugar vacío para dejarlo suelto.</li>
<li><b>Clic derecho</b>: en una tubería, <b>Desconectar de J…</b> suelta uno de los extremos (hay un elemento para cada extremo); en una unión, [[t:network.menu.disconnectPipes]] suelta todas las tuberías unidas a ella, y la unión se puede mover, cambiar o eliminar sin perder sus tuberías.</li>
<li><b>En el panel</b>: en [[t:inspector.pipe.connections]], [[t:inspector.pipe.startJunction]] y [[t:inspector.pipe.endJunction]] eligen la unión de cada extremo en una lista, y [[t:inspector.pipe.loose]] suelta ese extremo.</li>
</ul>
<p>Un <b>extremo suelto</b> se dibuja como un anillo en la punta de la tubería: arrastre el anillo hasta una unión para unirlo. Mientras la tubería tenga un extremo suelto, está incompleta: la lista de verificación lo indica y el cálculo espera.</p>
<p>El sentido de referencia no cambia: el extremo de origen sigue siendo el origen. La vista 3D funciona igual, y allí <kbd>Mayús</kbd> mueve el extremo hacia arriba y hacia abajo. <kbd>Esc</kbd> cancela el arrastre, y <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshace cualquier cambio.</p>
<p class="tip"><b>Consejo:</b> para poner un componente en medio de una tubería, colóquelo, arrastre un extremo de la tubería hasta él y dibuje una tubería nueva desde él hasta la unión que dejó ese extremo.</p>`,
          },
          select: {
            title: 'Seleccionar, mover y navegar',
            body: `<table>
<tr><th>Acción</th><th>Cómo</th></tr>
<tr><td>Seleccionar</td><td>Haga clic en el objeto con la herramienta [[t:network.palette.select]] (tecla <kbd>V</kbd>).</td></tr>
<tr><td>Agregar o quitar de la selección</td><td><kbd>Ctrl</kbd>+clic o <kbd>Mayús</kbd>+clic.</td></tr>
<tr><td>Seleccionar por área</td><td><kbd>Mayús</kbd>+arrastrar en un punto vacío: entran las uniones dentro del rectángulo y las tuberías con los dos extremos dentro.</td></tr>
<tr><td>Seleccionar todo</td><td><kbd>Ctrl</kbd>+<kbd>A</kbd>.</td></tr>
<tr><td>Quitar la selección</td><td>Haga clic en un punto vacío.</td></tr>
<tr><td>Mover</td><td>Arrastre una unión. Si forma parte de una selección, todo el grupo va con ella.</td></tr>
<tr><td>Mover la vista</td><td>Arrastre el fondo, o use el botón central del ratón.</td></tr>
<tr><td>Acercar y alejar</td><td>Rueda del ratón, las teclas <kbd>+</kbd> y <kbd>−</kbd>, o los botones de [[show:zoom|zoom]].</td></tr>
<tr><td>Encuadrar todo</td><td>La tecla <kbd>Inicio</kbd>, el botón [[t:network.zoom.fit]] o [[t:app.menu.edit]] → [[t:app.menu.fit]].</td></tr>
</table>`,
          },
          edit: {
            title: 'Editar, copiar y eliminar',
            body: `<ul>
<li><b>Datos</b>: seleccione el objeto y edítelo en el panel [[show:inspector|Propiedades]].</li>
<li><b>Cambiar el tipo de una unión</b>: en el panel, cambie [[t:inspector.junction.type]]. El nombre, la cota, la posición y los datos compatibles — como las pérdidas por tubería y el modelo de pérdida de las válvulas — se conservan.</li>
<li><b>Invertir el sentido de una tubería</b>: el botón [[t:inspector.pipe.reverse]] del panel, el menú [[t:app.menu.edit]] → [[t:app.menu.reverse]] o el clic derecho sobre la tubería.</li>
<li><b>Copiar y pegar</b>: <kbd>Ctrl</kbd>+<kbd>C</kbd> copia las uniones seleccionadas, los extremos de las tuberías seleccionadas y las tuberías entre ellas, con los valores del escenario actual; <kbd>Ctrl</kbd>+<kbd>V</kbd> pega una copia desplazada, y cada pegado nuevo desplaza un poco más.</li>
<li><b>Eliminar</b>: <kbd>Supr</kbd>. Eliminar una unión elimina también las tuberías unidas a ella. Para conservarlas, use antes [[t:network.menu.disconnectPipes]] (vea [[go:draw.connect|Desconectar y reconectar tuberías]]).</li>
<li><b>Deshacer y rehacer</b>: <kbd>Ctrl</kbd>+<kbd>Z</kbd> y <kbd>Ctrl</kbd>+<kbd>Y</kbd>.</li>
</ul>
<p class="tip"><b>Consejo:</b> los atajos no actúan mientras usted escribe en un campo. Así, <kbd>Supr</kbd> borra texto, no objetos.</p>`,
          },
          context: {
            title: 'Tarjeta de datos (clic derecho)',
            body: `<p>Haga clic derecho en una tubería o en una unión para abrir su tarjeta de datos, con los principales números del objeto en las unidades predeterminadas.</p>
<ul>
<li><b>Tubería</b>: longitud, diámetro, cotas, caudal, velocidad con su franja de velocidad, pérdida de carga, presiones de estancamiento y estáticas, número de Reynolds, factor de fricción, K de los accesorios y el sentido del flujo.</li>
<li><b>Unión</b>: cota, presiones, caudal a través y los resultados propios del tipo, como la altura de una bomba, el estado de una válvula de control o el Cv equivalente de una válvula.</li>
</ul>
<p>Al pie de la tarjeta están las acciones: [[t:network.menu.reverse]] y <b>Desconectar de J…</b> (tuberías), [[t:network.menu.disconnectPipes]] (uniones), [[t:network.menu.copy]], [[t:network.menu.paste]] y [[t:network.menu.delete]].</p>`,
          },
          direction: {
            title: 'Sentido y signos',
            body: `<p>Toda tubería tiene un <b>sentido de referencia</b>, de la unión de origen a la de destino. No obliga al fluido a ir hacia allá: si el caudal resulta negativo, el flujo va en contra del sentido de referencia, y la flecha del dibujo se invierte después del cálculo.</p>
<p>Algunos componentes dependen del sentido:</p>
<ul>
<li>[[icon:pump]] [[t:junctions.pump.label]] y [[icon:control]] [[t:junctions.control.label]] necesitan exactamente una tubería que llega y una que sale; el flujo previsto va de la que llega a la que sale.</li>
<li>En los demás componentes de dos puertos — [[t:junctions.valve.label]], [[t:junctions.orifice.label]] y [[t:junctions.generic.label]] —, el K se refiere a la tubería aguas arriba, según el sentido real del flujo.</li>
</ul>
<p>Para corregir una tubería dibujada al revés, use [[t:inspector.pipe.reverse]]. El flujo en contra del sentido de referencia en un componente genera un aviso de precaución, porque el K indicado puede no valer en ese sentido.</p>`,
          },
        },
      },

      junctions: {
        title: 'Tipos de unión',
        sections: {
          overview: {
            title: 'Visión general',
            body: `<p>Las uniones están en los extremos de las tuberías. En la paleta se agrupan así:</p>
<table>
<tr><th>Grupo</th><th>Tipo</th><th>Tuberías</th><th>Función</th></tr>
<tr><td>[[t:junctions.groups.boundary]]</td><td>[[icon:reservoir]] [[t:junctions.reservoir.label]]</td><td>1 a 25</td><td>Presión conocida en la superficie del líquido</td></tr>
<tr><td></td><td>[[icon:pressure]] [[t:junctions.pressure.label]]</td><td>1 a 25</td><td>Presión conocida en un punto</td></tr>
<tr><td></td><td>[[icon:flow]] [[t:junctions.flow.label]]</td><td>1</td><td>Caudal conocido que entra o sale</td></tr>
<tr><td></td><td>[[icon:spray]] [[t:junctions.spray.label]]</td><td>1 a 4</td><td>Descarga por un área efectiva hacia una presión externa</td></tr>
<tr><td>[[t:junctions.groups.connection]]</td><td>[[icon:branch]] [[t:junctions.branch.label]]</td><td>2 a 25</td><td>Encuentro de tuberías, con fuente o consumo opcional</td></tr>
<tr><td>[[t:junctions.groups.equipment]]</td><td>[[icon:pump]] [[t:junctions.pump.label]]</td><td>2</td><td>Agrega carga según su curva altura × caudal</td></tr>
<tr><td>[[t:junctions.groups.valves]]</td><td>[[icon:valve]] [[t:junctions.valve.label]]</td><td>2</td><td>Pérdida por K, Cv o Kv; puede estar cerrada</td></tr>
<tr><td></td><td>[[icon:control]] [[t:junctions.control.label]]</td><td>2</td><td>Mantiene una presión, un caudal o un ΔP</td></tr>
<tr><td></td><td>[[icon:exitvalve]] [[t:junctions.exitvalve.label]]</td><td>1</td><td>Descarga hacia una presión residual</td></tr>
<tr><td>[[t:junctions.groups.losses]]</td><td>[[icon:orifice]] [[t:junctions.orifice.label]]</td><td>2</td><td>Placa de orificio</td></tr>
<tr><td></td><td>[[icon:generic]] [[t:junctions.generic.label]]</td><td>2</td><td>Pérdida por K o por una curva ΔP × caudal</td></tr>
</table>
<h4>Referencia de presión</h4>
<p>Cada parte conectada de la red necesita al menos una unión que fije la presión: [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]], [[t:junctions.spray.label]] o [[t:junctions.exitvalve.label]] (o una válvula de control de presión mientras controla). Sin ella, el cálculo se rechaza con un mensaje de tramo sin referencia de presión.</p>
<h4>Cota y pérdidas por tubería</h4>
<p>Toda unión tiene una [[t:inspector.junction.elevation]], usada en el término de gravedad de las ecuaciones. [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]] y [[t:junctions.branch.label]] tienen además la tabla [[t:inspector.pipeLosses.title]], con un K de salida y uno de llegada para cada tubería unida. Vea [[go:pipes.ends|Pérdidas en los extremos]].</p>`,
          },
          reservoir: {
            title: 'Reservorio',
            body: `<p>[[icon:reservoir]] Un tanque o lago con superficie libre: el nivel del líquido y la presión sobre él son conocidos. Es la referencia de presión más común.</p>
<h4>Datos</h4>
<ul>
<li>[[t:junctions.reservoir.elevation]]: la cota del piso del tanque; una tubería sin cota ni profundidad propias en la tabla de pérdidas por tubería se une en ella.</li>
<li>[[t:junctions.reservoir.form.liquidElev]]: la cota de la superficie del líquido, en la misma referencia que el fondo (no la altura de líquido sobre el fondo).</li>
<li>[[t:junctions.reservoir.form.surfP]]: 0 kgf/cm²(g) para un tanque abierto; otro valor para un recipiente presurizado.</li>
<li>[[t:inspector.pipeLosses.title]]: el K de salida del tanque hacia cada tubería (una entrada de borde vivo, por ejemplo, tiene 0,5), el K de llegada de la tubería al tanque (una salida al tanque, 1,0) y dónde se une cada tubería (en blanco, el fondo).</li>
<li>[[t:inspector.pipeLosses.connBy]]: por cota, la conexión queda donde está; por profundidad bajo la superficie del líquido, acompaña la superficie cuando el nivel cambia (en un escenario, por ejemplo). Pasar de una a otra mantiene cada conexión donde está.</li>
</ul>
<p>En lo alto de los datos, un dibujo del tanque en corte muestra estas cotas en una misma escala: el nivel del líquido y el fondo a la izquierda, la presión en la superficie arriba y cada tubería en la pared derecha, donde se une, con su cota, o con su profundidad acotada desde la superficie. El campo en edición, o bajo el puntero, ilumina su parte del dibujo.</p>
<h4>Cómo se calcula</h4>
<p>El reservorio es un nudo cuya presión de estancamiento es igual a la presión en la superficie, en la cota del nivel. Sin K indicado, la presión de estancamiento es continua entre el tanque y el extremo de la tubería. Una tubería unida por encima del nivel del líquido descarga en caída libre; si intenta tomar líquido del tanque, aparece un aviso.</p>
<p>En los resultados, cada reservorio aparece en [[t:results.boundaries.title]], con el caudal que entra en la red o sale de ella por allí.</p>`,
          },
          pressure: {
            title: 'Presión impuesta',
            body: `<p>[[icon:pressure]] Un punto de presión conocida, como la conexión a una red pública o un colector mantenido a presión constante.</p>
<ul>
<li>[[t:junctions.pressure.form.ptype]]: [[t:junctions.pressure.form.stagnation]] (la presión total en el nudo, la opción habitual) o [[t:junctions.pressure.form.static]], que vale para la única tubería unida: la presión estática es la de estancamiento menos ½ρV² de esa tubería.</li>
<li>[[t:junctions.pressure.form.P]]: el valor impuesto.</li>
</ul>
<p>Acepta hasta 25 tuberías (en el tipo estático, solo 1) y tiene la tabla de pérdidas por tubería. Sirve como referencia de presión.</p>`,
          },
          flow: {
            title: 'Caudal impuesto',
            body: `<p>[[icon:flow]] Un caudal conocido que <b>sale</b> del sistema (un consumo) o <b>entra</b> en él (una alimentación), en el extremo de una única tubería.</p>
<ul>
<li>[[t:junctions.flow.form.Q]]: valor positivo, másico o volumétrico.</li>
<li>[[t:junctions.flow.form.dir]]: [[t:junctions.flow.form.out]] o [[t:junctions.flow.form.in]].</li>
</ul>
<p>Un caudal impuesto no fija la presión: la red necesita una referencia de presión en otro punto. Con caudal cero, la unión funciona como un extremo cerrado.</p>`,
          },
          spray: {
            title: 'Boquilla / aspersor',
            body: `<p>[[icon:spray]] Una boquilla, aspersor o rociador que descarga hacia una presión externa, normalmente la atmósfera. Su caudal depende de la presión disponible en la entrada.</p>
<ul>
<li>[[t:junctions.spray.form.CdA]]: indique el [[t:junctions.spray.form.dHole]], el [[t:junctions.spray.form.nHoles]] y el coeficiente de descarga Cd.</li>
<li>[[t:junctions.spray.form.K]]: el factor K de catálogo, con Q = K·√ΔP (en L/min/bar½, gpm/psi½ o m³/h/bar½). Supone agua.</li>
<li>[[t:junctions.spray.form.Pext]]: la presión hacia donde descarga; 0 kgf/cm²(g) para la atmósfera.</li>
</ul>
<p>Acepta de 1 a 4 tuberías y sirve como referencia de presión. Las ecuaciones están en [[go:tech.valves|Válvulas, orificios y boquillas]].</p>`,
          },
          branch: {
            title: 'Nudo',
            body: `<p>[[icon:branch]] El encuentro de dos o más tuberías: una te, una cruz, un cambio de diámetro o de material. La presión de estancamiento es la misma para todas las tuberías, salvo las pérdidas indicadas en la tabla de pérdidas por tubería.</p>
<ul>
<li>[[t:junctions.branch.form.source]]: positiva entra en el sistema; negativa sale de él (un consumo concentrado). En la mayoría de los casos, cero.</li>
</ul>
<p>La herramienta [[t:network.palette.pipe]] crea un nudo automáticamente cuando usted hace clic en un punto vacío.</p>`,
          },
          pump: {
            title: 'Bomba',
            body: `<p>[[icon:pump]] Agrega energía al flujo según su curva de altura manométrica × caudal. Necesita una tubería que llega (succión) y otra que sale (impulsión).</p>
<h4>Estado y modo</h4>
<ul>
<li>[[t:junctions.pump.form.state]]: [[t:junctions.pump.form.on]], [[t:junctions.pump.form.offClosed]] (caudal cero) o [[t:junctions.pump.form.offOpen]] (ni ganancia ni pérdida).</li>
<li>[[t:junctions.pump.form.modes.curve]]: la bomba trabaja sobre su curva, a la velocidad indicada (en % de la nominal).</li>
<li>[[t:junctions.pump.form.modes.fixedFlow]]: la bomba entrega el caudal indicado y el cálculo muestra la altura necesaria. No usa curva — es el modo para elegir una bomba.</li>
<li>[[t:junctions.pump.form.modes.controlFlow]], [[t:junctions.pump.form.modes.controlDischarge]] y [[t:junctions.pump.form.modes.controlSuction]]: la velocidad se ajusta para mantener el caudal o la presión estática de ajuste, y el resultado muestra la velocidad necesaria.</li>
<li>[[t:junctions.pump.form.nPumps]]: bombas idénticas lado a lado; cada una lleva el caudal total dividido por N.</li>
</ul>
<h4>Curvas</h4>
<p>Indique puntos de la [[t:junctions.pump.curves.head]] y, si quiere, de la eficiencia y del NPSH requerido. En cada tabla elija las unidades y el [[t:inspector.curve.fitType]] (polinomio de orden 0 a 4 o interpolación lineal); el gráfico de al lado muestra los puntos y la curva ajustada, y el cálculo siempre usa la curva ajustada. Sin curva de eficiencia, la potencia en el eje es igual a la hidráulica.</p>
<h4>Resultados</h4>
<p>Altura manométrica, aumento de presión, velocidad, potencias hidráulica y en el eje, eficiencia y NPSH disponible y requerido. Los avisos alertan sobre reflujo, operación más allá del final de la curva, NPSH insuficiente y curvas mal ajustadas. El gráfico [[t:charts.tabs.pump]] muestra el punto de operación. Las ecuaciones están en [[go:tech.pumps|Bombas]].</p>`,
          },
          valve: {
            title: 'Válvula',
            body: `<p>[[icon:valve]] Una válvula, o cualquier componente en línea con una pérdida localizada conocida.</p>
<ul>
<li>[[t:junctions.lossModel.label]]: [[t:junctions.lossModel.K]], [[t:junctions.lossModel.Cv]] o [[t:junctions.lossModel.Kv]].</li>
<li>[[t:junctions.valve.form.closed]]: caudal cero. En la vista 3D, la válvula cerrada aparece en rojo.</li>
</ul>
<p>Los resultados traen la caída de presión, el K efectivo y el Cv equivalente. Para pérdidas que acompañan a la tubería, como codos y válvulas de bloqueo siempre abiertas, también se puede usar la lista de [[go:pipes.fittings|accesorios de la tubería]].</p>`,
          },
          control: {
            title: 'Válvula de control',
            body: `<p>[[icon:control]] Una válvula que se ajusta sola para mantener un valor. Necesita una tubería que llega y otra que sale.</p>
<table>
<tr><th>[[t:junctions.control.form.ctype]]</th><th>Mantiene</th></tr>
<tr><td>[[t:junctions.control.form.types.PRV]]</td><td>la presión aguas abajo</td></tr>
<tr><td>[[t:junctions.control.form.types.PSV]]</td><td>la presión aguas arriba</td></tr>
<tr><td>[[t:junctions.control.form.types.FCV]]</td><td>el caudal</td></tr>
<tr><td>[[t:junctions.control.form.types.PDCV]]</td><td>la caída de presión a través de ella</td></tr>
</table>
<ul>
<li>[[t:junctions.control.form.basis]] (PRV y PSV): presión estática (la habitual) o de estancamiento.</li>
<li>[[t:junctions.control.form.alwaysControl]]: activado, la válvula mantiene el ajuste incluso cuando tendría que agregar presión, y el resultado avisa, porque una válvula real no hace eso. Desactivado, puede abrir totalmente o cerrar cuando no logra controlar.</li>
<li>[[t:junctions.control.form.kOpen]]: la pérdida de la válvula totalmente abierta.</li>
<li>[[t:junctions.control.form.failAction]] (FCV): abrir totalmente o cerrar.</li>
<li>[[t:junctions.control.form.special]]: fuerza la válvula cerrada o totalmente abierta, ignorando el ajuste.</li>
</ul>
<p>El estado resultante — controlando, totalmente abierta o cerrada — aparece en el panel y en la tabla de válvulas. Detalles en [[go:tech.valves|Válvulas, orificios y boquillas]].</p>`,
          },
          exitvalve: {
            title: 'Válvula de salida',
            body: `<p>[[icon:exitvalve]] El extremo de una tubería que descarga, a través de una válvula, hacia una presión residual conocida — el punto de entrega de una aducción, por ejemplo. Acepta una única tubería y sirve como referencia de presión.</p>
<ul>
<li>[[t:junctions.exitvalve.elevation]]: la cota de la salida.</li>
<li>[[t:junctions.exitvalve.form.Pout]]: la presión después de la válvula.</li>
<li>[[t:junctions.lossModel.label]]: K, Cv o Kv. Con K = 0, la presión de estancamiento en el extremo de la tubería es igual a la residual.</li>
</ul>
<p>Si la presión residual fuera mayor que la de la red, el fluido entraría por la salida, y un aviso lo indica.</p>`,
          },
          orifice: {
            title: 'Orificio',
            body: `<p>[[icon:orifice]] Una placa de orificio entre dos tuberías, usada para medir o limitar el caudal.</p>
<ul>
<li>[[t:junctions.orifice.form.sharp]] y [[t:junctions.orifice.form.rounded]]: el K sale de las correlaciones de Idelchik, a partir del [[t:junctions.orifice.form.dO]] (y del [[t:junctions.orifice.form.rEdge]], en el redondeado) y de las áreas de las tuberías.</li>
<li>[[t:junctions.orifice.form.Cd]]: K = (1 − β⁴)/Cd² sobre la velocidad en el orificio, convertido a la tubería aguas arriba.</li>
<li>[[t:junctions.orifice.form.K]]: un K directo, referido a la tubería aguas arriba.</li>
</ul>
<p>El orificio debe ser menor que las tuberías. Las fórmulas están en [[go:tech.valves|Válvulas, orificios y boquillas]].</p>`,
          },
          generic: {
            title: 'Componente genérico',
            body: `<p>[[icon:generic]] Cualquier componente cuya pérdida usted conoce: un filtro, un intercambiador de calor, un medidor.</p>
<ul>
<li>[[t:junctions.generic.form.K]]: una pérdida K·ρV²/2, con la velocidad de la tubería aguas arriba.</li>
<li>[[t:junctions.generic.form.curve]]: puntos de catálogo de caída de presión × caudal (al menos 2), con el tipo de ajuste a elección.</li>
</ul>`,
          },
        },
      },

      pipes: {
        title: 'Tuberías',
        sections: {
          geometry: {
            title: 'Geometría y material',
            body: `<ul>
<li>[[t:inspector.pipe.length]]: la longitud hidráulica real. El dibujo no interviene.</li>
<li>[[t:inspector.pipe.material]]: [[t:inspector.pipe.userDefined]], para escribir el diámetro, o un catálogo, cuya norma da el diámetro interior:
<ul>
<li>[[t:inspector.pipe.materials.steel]] (cédulas 40, 80, STD y XS) y [[t:inspector.pipe.materials.stainless]] (5S, 10S, 40S y 80S): el tamaño nominal en pulgadas y la cédula;</li>
<li>[[t:inspector.pipe.materials.hdpe]]: el diámetro exterior en milímetros, el SDR y el compuesto (PE 100 o PE 80), que fija la presión nominal PN; la pared es la mínima de la norma;</li>
<li>[[t:inspector.pipe.materials.ductile]]: el DN y la clase de espesor (K7 o K9); el diámetro interior descuenta el revestimiento de mortero de cemento.</li>
</ul>
Al elegir un catálogo, la rugosidad pasa a ser la del material, y todavía se puede cambiar.</li>
<li>[[t:inspector.pipe.section]]: [[t:inspector.pipe.sections.circular]], [[t:inspector.pipe.sections.annulus]] (diámetros exterior e interior), [[t:inspector.pipe.sections.rectangular]] (ancho y alto) o [[t:inspector.pipe.sections.noncircular]] (área y perímetro mojado). El panel muestra el [[t:inspector.pipe.hydraulicDiameter]].</li>
<li>[[t:inspector.pipe.idReduction]]: reduce el diámetro hidráulico en un porcentaje, para simular depósitos en las paredes.</li>
<li>[[t:inspector.pipe.nParallel]]: N tuberías iguales lado a lado; el caudal se reparte por igual entre ellas.</li>
<li>[[t:inspector.pipe.special]]: [[t:inspector.pipe.closed]].</li>
</ul>`,
          },
          friction: {
            title: 'Fricción',
            body: `<p>Elija el [[t:inspector.pipe.model]] de fricción:</p>
<ul>
<li>[[t:inspector.pipe.models.roughness]] (predeterminado): indique ε, o elija un [[t:inspector.pipe.typicalValue]] — acero comercial 0,046 mm, acero inoxidable 0,015 mm, hierro galvanizado 0,15 mm, hierro dúctil revestido de mortero de cemento 0,1 mm (proyecto) o 0,03 mm (tubo nuevo), PVC y PEAD 0,0015 mm y otros.</li>
<li>[[t:inspector.pipe.models.relRoughness]]: el valor de ε/D directo.</li>
<li>[[t:inspector.pipe.models.smooth]]: ε = 0.</li>
<li>[[t:inspector.pipe.models.explicitF]]: un factor de fricción de Darcy constante.</li>
<li>[[t:inspector.pipe.models.hw]]: el coeficiente C, común en redes de agua; no depende de la viscosidad.</li>
<li>[[t:inspector.pipe.models.frictionless]]: solo para pruebas; no lo use en un proyecto.</li>
</ul>
<p>Las ecuaciones — Darcy-Weisbach, Colebrook y la transición entre laminar y turbulento — están en [[go:tech.friction|Fricción en las tuberías]].</p>`,
          },
          fittings: {
            title: 'Accesorios',
            body: `<p>La sección [[t:inspector.fittings.title]] lista las pérdidas localizadas de la tubería: codos, tes, válvulas de bloqueo, entradas y salidas.</p>
<ol class="steps">
<li>En [[t:inspector.fittings.add]], elija un ítem de la biblioteca, o [[t:core.data.fittings.custom]] para escribir un K.</li>
<li>Ajuste la cantidad y, si quiere, el valor.</li>
</ol>
<p>Los ítems marcados con <b>·f<sub>T</sub></b> siguen el método K/f<sub>T</sub> del Crane TP-410: K = n·f<sub>T</sub>, con f<sub>T</sub> calculado para el diámetro interior real de la tubería (el panel muestra [[t:inspector.fittings.craneFT]]). Los demás tienen K constante. La suma, [[t:inspector.fittings.sumK]], actúa sobre la velocidad de la tubería, como una pérdida repartida a lo largo de ella.</p>
<p class="tip"><b>Consejo:</b> para una válvula que quiera abrir, cerrar o seguir en los resultados, prefiera la unión [[t:junctions.valve.label]].</p>`,
          },
          ends: {
            title: 'Pérdidas en los extremos',
            body: `<p>En las uniones de un solo nudo — [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]] y [[t:junctions.branch.label]] —, la tabla [[t:inspector.pipeLosses.title]] define, para cada tubería unida:</p>
<ul>
<li>[[t:inspector.pipeLosses.kOut]]: la pérdida cuando el fluido sale de la unión y entra en la tubería (por ejemplo, una entrada de borde vivo, 0,5).</li>
<li>[[t:inspector.pipeLosses.kIn]]: la pérdida cuando el fluido llega de la tubería a la unión (por ejemplo, la salida a un tanque, 1,0).</li>
<li>[[t:inspector.pipeLosses.elevation]] o [[t:inspector.pipeLosses.depth]] (solo en el reservorio): dónde se une esa tubería, como cota o como profundidad bajo la superficie del líquido ([[t:inspector.pipeLosses.connBy]]); en blanco, el fondo.</li>
</ul>
<p>Cada K usa el área de su propia tubería y solo actúa en el sentido correspondiente del flujo.</p>`,
          },
        },
      },

      system: {
        title: 'Sistema y solución',
        sections: {
          fluid: {
            title: 'Fluido',
            body: `<p>Las propiedades del sistema están en la ventana [[t:inspector.system.title]]. Se abre desde el [[show:stamp|sello del régimen]], junto al título del modelo; desde el menú [[t:app.menu.edit]] → [[t:app.menu.system]]; desde los ítems del sistema en la lista de verificación; o desde el botón [[t:inspector.system.open]] del panel, abierto por su flecha sin nada seleccionado. Cada cambio vale al instante, como en el panel. Arriba de la ventana está el [[t:inspector.system.regime]]; con [[t:inspector.system.regimes.incompressible]], la sección [[t:inspector.system.fluid]] trae:</p>
<ul>
<li>[[t:core.fluids.water.label]]: indique la [[t:inspector.system.temperature]] (de 0 a 150 °C); la densidad, la viscosidad y la presión de vapor salen de correlaciones públicas.</li>
<li>[[t:inspector.system.userDefined]]: indique la densidad, la viscosidad dinámica y, si quiere los avisos de cavitación, la presión de vapor.</li>
</ul>
<p>Los valores en uso (ρ, μ y Pv) aparecen justo debajo. En este régimen el fluido tiene densidad constante y una sola temperatura; para gases, vea [[go:gas.concept|el modo compresible]]. Las correlaciones están en [[go:tech.fluid|Propiedades del agua]].</p>`,
          },
          environment: {
            title: 'Ambiente y flujo',
            body: `<ul>
<li>[[t:inspector.system.patm]]: convierte presiones manométricas en absolutas y entra en el NPSH disponible. El valor predeterminado, 1,03323 kgf/cm²(a), es el nivel del mar.</li>
<li>[[t:inspector.system.gravity]]: múltiplo de la gravedad estándar, g₀ = 9,80665 m/s².</li>
<li>[[t:inspector.system.reLam]] y [[t:inspector.system.reTurb]]: los límites del régimen (2300 y 4000, por defecto). Entre ellos, el factor de fricción se interpola linealmente.</li>
<li>[[t:inspector.system.laminarK]]: en flujo laminar, las pérdidas de los accesorios crecen. [[t:inspector.system.craneFt]] (predeterminado) y [[t:inspector.system.pipeFt]] multiplican el K por la razón entre el factor de fricción laminar y un factor turbulento de referencia; [[t:inspector.system.noCorrection]] usa el K tal como se indicó. Detalles en [[go:tech.minor|Pérdidas localizadas]].</li>
</ul>`,
          },
          solution: {
            title: 'Control de la solución',
            body: `<ul>
<li>[[t:inspector.system.tolRel]] (predeterminada 0,0001): el cálculo se detiene cuando la variación relativa de todos los caudales y presiones queda por debajo de ella en dos iteraciones seguidas.</li>
<li>[[t:inspector.system.maxIter]] (predeterminado 500): el límite de iteraciones.</li>
<li>[[t:inspector.system.relax]] (predeterminada 1): la fracción del paso de Newton aplicada en cada iteración, entre 0 y 1.</li>
<li>[[t:inspector.system.adaptive]] (activada): reduce el paso a la mitad cuando empeora los residuos.</li>
<li>[[t:inspector.system.checkMass]] (activada): comprueba la conservación de la masa en cada unión y avisa si algo no cierra.</li>
</ul>
<p class="tip"><b>Si el cálculo no converge:</b> revise los datos (curvas de bomba coherentes, válvulas de control con ajustes posibles), deje activada la relajación adaptativa y pruebe una relajación menor, como 0,5. Una relajación cercana a la tolerancia puede parecer convergida sin estarlo — la aplicación avisa cuando ocurre.</p>
<p>El método está en [[go:tech.newton|Método de solución]].</p>`,
          },
        },
      },

      scenarios: {
        title: 'Escenarios',
        sections: {
          concept: {
            title: 'Cómo funcionan',
            body: `<p>Los escenarios permiten comparar variantes del mismo sistema — otra velocidad, una válvula cerrada, una demanda de punta — sin duplicar el modelo.</p>
<ul>
<li>El escenario <b>Base</b> define todo. Cada escenario hijo guarda <b>solo lo que cambia</b> respecto a su padre; el resto se hereda.</li>
<li>Cambiar un valor en el padre cambia también a los hijos que no modificaron ese atributo.</li>
<li>La <b>topología es la misma</b> en todos los escenarios: agregar o eliminar tuberías y uniones vale para todos. Para "quitar" un tramo en un escenario, cierre la tubería o la válvula en él.</li>
<li>Cada escenario tiene sus propios resultados, calculados cuando pasa a la pantalla.</li>
</ul>`,
          },
          working: {
            title: 'Crear y comparar',
            body: `<ol class="steps">
<li>En la lista [[t:app.scenario.label]], elija el escenario que será el padre y haga clic en <b>+</b>. Dé un nombre al nuevo escenario: pasa a ser el actual.</li>
<li>Cambie los valores que difieren. Un punto de color aparece junto a cada campo cambiado; haga clic en el punto para volver a heredar el valor del padre.</li>
<li>Cambie de escenario en la lista para comparar los resultados.</li>
</ol>
<ul>
<li>En la sección [[t:inspector.system.scenario]] (en la ventana [[t:inspector.system.title]]) están las notas del escenario, el número de atributos cambiados y el botón [[t:inspector.system.showDiffs]], con la tabla "en este escenario × en el padre".</li>
<li>En la pestaña [[t:app.tabs.data]], las celdas que difieren del padre quedan resaltadas.</li>
<li>Los botones junto a la lista cambian el nombre y eliminan el escenario actual, junto con sus hijos. El escenario Base no se puede eliminar.</li>
</ul>`,
          },
        },
      },

      results: {
        title: 'Resultados',
        sections: {
          overlay: {
            title: 'Resultados en el dibujo',
            body: `<p>La lista [[show:overlay|Resultados en el dibujo]], en la esquina inferior del área de dibujo, colorea las tuberías por una magnitud y escribe los valores junto a ellas:</p>
<ul>
<li>[[t:network.overlay.Q]], [[t:network.overlay.V]] y [[t:network.overlay.dP0]]: los valores de cada tubería.</li>
<li>[[t:network.overlay.P]] y [[t:network.overlay.HGL]]: el promedio entre la entrada y la salida de cada tubería; las uniones muestran su propio valor.</li>
</ul>
<p>Una leyenda muestra la escala. La velocidad usa una escala fija para agua, explicada en [[go:results.velocity|Escala de velocidad]]; las otras magnitudes van del mínimo al máximo del modelo.</p>
<p>También funciona en la vista 3D. Hace falta tener resultados: complete la lista de verificación.</p>`,
          },
          tables: {
            title: 'Pestaña Resultados',
            body: `<p>La pestaña [[t:app.tabs.out]] tiene seis partes:</p>
<ul>
<li>[[t:results.tabs.general]]: estado del cálculo, iteraciones, fluido y ambiente; [[t:results.boundaries.title]], con lo que entra y sale de la red en cada contorno; y los avisos.</li>
<li>[[t:results.tabs.pipes]]: por defecto, para líquidos y gases, diámetro nominal, schedule, cotas, caudal, velocidad, presiones de estancamiento a la entrada y a la salida y K de los accesorios.</li>
<li>[[t:results.tabs.junctions]]: por defecto, presiones de estancamiento y estáticas, ΔP0, K efectivo, caudal a través, HGL y cota.</li>
<li>[[t:results.tabs.pumps]]: por defecto, caudal, altura, ΔP, velocidad, eficiencia, potencias y NPSH.</li>
<li>[[t:results.tabs.valves]]: por defecto, estado, caudal, ΔP0, presión estática a la entrada, Cv y K efectivos.</li>
<li>[[t:results.tabs.warnings]]: la lista completa de avisos.</li>
</ul>
<p>Haga clic en una fila, o en un aviso, para ubicar el objeto en el dibujo. Cada columna numérica elige su propia unidad en el encabezado.</p>
<h4>Elegir las columnas</h4>
<p>El botón con tres columnas, arriba de cada tabla, abre la ventana [[t:results.setup.title]]. A la izquierda, en [[t:results.setup.available]], están las salidas que la tabla todavía puede mostrar, en grupos (presiones, pérdidas, líneas de carga, NPSH…) y con un filtro. A la derecha, en [[t:results.setup.shown]], están las columnas de la tabla, en orden, cada una con su unidad.</p>
<ul>
<li>Haga clic para seleccionar una o más salidas; [[t:results.setup.add]] y [[t:results.setup.remove]] pasan las seleccionadas al otro lado, y un doble clic pasa una sola. Las flechas suben o bajan las columnas seleccionadas. La primera columna, que ubica el objeto, queda siempre.</li>
<li>Los líquidos y los gases tienen columnas propias: alterne entre [[t:results.setup.liquid]] y [[t:results.setup.gas]]; un punto marca el fluido del modelo abierto.</li>
<li>[[t:results.setup.save]] guarda las columnas en este navegador, para los próximos resultados y las próximas veces que abra Pump It. [[t:results.setup.reset]] vuelve a las columnas predeterminadas de la tabla en pantalla.</li>
<li>[[t:results.setup.templates]]: [[t:results.setup.saveAs]] guarda las cuatro tablas del fluido con un nombre, que [[t:results.setup.apply]] trae de vuelta. [[t:results.setup.export]] graba las columnas y las plantillas en un archivo, que [[t:results.setup.import]] lee en otro navegador.</li>
</ul>
<p>Qué es cada salida está en [[go:tech.outputs|Resultados derivados]].</p>
<h4>Llevar a Excel</h4>
<p>[[t:results.exportExcel]], arriba de cada tabla y en [[t:app.menu.file]], genera un solo archivo .xlsx con una hoja para cada tabla — [[t:results.tabs.pipes]], [[t:results.tabs.junctions]], [[t:results.tabs.pumps]] y [[t:results.tabs.valves]] —, con las columnas y unidades elegidas: encabezado formateado, números como valores y filtro. [[t:results.copyExcel]] y [[t:results.copyTable]] copian la tabla en pantalla para pegarla en una planilla.</p>`,
          },
          warnings: {
            title: 'Avisos',
            body: `<p>Los avisos tienen tres niveles: [[t:results.level.critical]] (el resultado probablemente no representa la realidad), [[t:results.level.warning]] (algo merece atención) y [[t:results.level.caution]] (una observación). Los más comunes:</p>
<table>
<tr><th>Aviso</th><th>Qué hacer</th></tr>
<tr><td>La solución no convergió</td><td>Revise los datos y vea [[go:system.solution|Control de la solución]].</td></tr>
<tr><td>Presión estática por debajo de la presión de vapor</td><td>Riesgo de cavitación o de separación de la columna: aumente la presión (cotas, bomba) o reduzca las pérdidas.</td></tr>
<tr><td>NPSH disponible menor que el requerido</td><td>La bomba va a cavitar: aumente la presión en la succión o reduzca las pérdidas antes de ella.</td></tr>
<tr><td>Bomba más allá del final de la curva, o reflujo en la bomba</td><td>El punto de operación salió de la curva indicada: extienda la curva o revise el sistema.</td></tr>
<tr><td>Válvula de control agregando presión, o sin control</td><td>El ajuste no se alcanza con la presión disponible: revise el ajuste o el sistema.</td></tr>
<tr><td>Flujo en contra del sentido de referencia</td><td>Compruebe que el componente esté unido en el sentido correcto.</td></tr>
<tr><td>Masa desbalanceada en una unión</td><td>La continuidad no cerró: reduzca la tolerancia.</td></tr>
<tr><td>Tramo sin referencia de presión</td><td>Una un reservorio, una presión impuesta o una boquilla a ese tramo.</td></tr>
</table>
<p>El número de la pestaña [[t:app.tabs.out]] cuenta los avisos y se pone rojo cuando hay alguno crítico. Haga clic en un aviso para ubicar el objeto.</p>`,
          },
          velocity: {
            title: 'Escala de velocidad',
            body: `<p>En [[t:network.overlay.V]], el color sigue una escala fija para agua — no el mínimo y el máximo del modelo —, para que el mismo color signifique la misma franja en cualquier red:</p>
<table>
<tr><th>Velocidad (m/s)</th><th>Franja</th></tr>
<tr><td>por debajo de 0,6</td><td>[[t:core.data.velocity.belowMin]]: riesgo de sedimentación</td></tr>
<tr><td>0,6 a 1,0</td><td>[[t:core.data.velocity.low]]: la tubería quizás esté sobredimensionada</td></tr>
<tr><td>1,0 a 2,5</td><td>[[t:core.data.velocity.economic]]</td></tr>
<tr><td>2,5 a 3,0</td><td>[[t:core.data.velocity.high]]</td></tr>
<tr><td>3,0 a 5,0</td><td>[[t:core.data.velocity.veryHigh]]</td></tr>
<tr><td>por encima de 5,0</td><td>fuera de escala (negro)</td></tr>
</table>
<p>Son referencias de proyecto, no límites normativos: la velocidad económica de cada instalación depende del costo de la energía, de las horas de operación y del material. La tarjeta de datos y el panel de la tubería muestran la franja junto a la velocidad.</p>`,
          },
          inputs: {
            title: 'Datos del modelo',
            body: `<p>La pestaña [[t:app.tabs.data]] lista las entradas del escenario actual: una tabla de tuberías (conexión, longitud, material, sección, fricción, accesorios, paralelas y condición) y una de uniones (tipo, cota y datos principales).</p>
<ul>
<li>Las celdas resaltadas difieren del escenario padre.</li>
<li>Los objetos incompletos aparecen como indefinidos.</li>
<li>Haga clic en una fila para seleccionar el objeto y editarlo en la pestaña [[t:app.tabs.net]].</li>
</ul>`,
          },
        },
      },

      charts: {
        title: 'Gráficos',
        sections: {
          pump: {
            title: 'Bomba × sistema',
            body: `<p>Elija la bomba en la lista. El gráfico muestra:</p>
<ul>
<li>la <b>curva de la bomba</b> a la velocidad actual, ya con las bombas en paralelo, si las hay;</li>
<li>la <b>curva del sistema</b>: la altura que el resto de la red exige para cada caudal. Se obtiene ejecutando el solver varias veces con caudal fijo en la bomba, con el resto del modelo como está en el escenario actual;</li>
<li>el <b>punto de operación</b>, cuando el modelo está calculado.</li>
</ul>
<p>Las unidades de caudal y de altura se eligen en las listas sobre el gráfico. En el modo [[t:junctions.pump.form.modes.fixedFlow]] solo aparece la curva del sistema — útil para elegir una bomba.</p>`,
          },
          profile: {
            title: 'Perfil',
            body: `<p>El perfil muestra cómo varían las magnitudes a lo largo de un camino de tuberías:</p>
<ol class="steps">
<li>Elija las uniones [[t:charts.profile.from]] y [[t:charts.profile.to]]. El camino es el que tiene menos tuberías entre ellas, en cualquier sentido.</li>
<li>Elija la [[t:charts.profile.quantity]]: [[t:charts.profile.heads]] (HGL, EGL y la cota de la tubería) o [[t:charts.profile.pressures]] (con la presión de vapor como referencia).</li>
</ol>
<p>Los escalones verticales son uniones con pérdida o ganancia, como bombas y válvulas. HGL y EGL usan presión absoluta.</p>`,
          },
        },
      },

      views3d: {
        title: 'Vista 3D',
        sections: {
          concept: {
            title: 'Esquema y 3D',
            body: `<p>En la parte superior del área de dibujo, [[show:views|Esquema · 3D]] (teclas <kbd>1</kbd> y <kbd>2</kbd>) alterna entre dos vistas del <b>mismo modelo</b>:</p>
<ul>
<li>el esquema es la <b>planta</b>: la posición de cada unión en el esquema es su posición en el plano;</li>
<li>la <b>altura</b> de cada unión es su cota, multiplicada por la [[t:inspector.view3.zScale]];</li>
<li>mover una unión en una vista la mueve en la otra, y subir o bajar una unión en la vista 3D <b>cambia su cota</b> y recalcula;</li>
<li>los trazados, los quiebres y las posiciones en el plano son solo dibujo: <b>ninguna longitud sale del dibujo</b>.</li>
</ul>
<p>En la primera entrada, la aplicación elige una escala vertical que deja legibles las alturas. Las tuberías aparecen como tubos sombreados con espesor según su diámetro, las más cercanas por encima de las de atrás, y las uniones como pequeños objetos 3D.</p>
<p>Los tubos y los objetos forman parte de la escena: al acercar o alejar, crecen y se reducen junto con la red, en las proporciones del esquema, y en perspectiva los más cercanos se ven más grandes, hasta que llegan tan cerca de la cámara que se desvanecen y se recortan, para que nada cubra la pantalla. Las etiquetas mantienen su tamaño en la pantalla.</p>`,
          },
          free: {
            title: 'Vista 3D',
            body: `<h4>Navegar</h4>
<p>Arrastre el fondo para girar alrededor de lo que está en el centro de la pantalla; el botón derecho, el botón central o <kbd>Mayús</kbd>+arrastrar mueven la vista; la rueda acerca en el punto del cursor, hacia lo que está debajo; el doble clic centra en un objeto. Las teclas de flecha giran la cámara 15°, y <kbd>Mayús</kbd>+flechas mueven la vista.</p>
<h4>El cubo de vistas</h4>
<p>El cubo de la esquina superior derecha gira con la cámara y nombra los lados de la red: arriba, el frente (la parte de abajo del esquema), la derecha y sus opuestos. Haga clic en una cara, una arista o un vértice para mirar desde ese lado, con la red encuadrada: una cara da la vista de frente, como la planta vista desde arriba, una arista la vista entre dos caras, y un vértice la isométrica. Arrastre el cubo para girar la cámara. Con una cara vista de frente, las flechas a su alrededor pasan a las caras vecinas. Con el cubo enfocado (<kbd>Tab</kbd>), las teclas de flecha pasan a la vista siguiente. [[t:app.menu.options]] → [[t:app.menu.viewCube]] lo oculta.</p>
<h4>Opciones</h4>
<p>La flecha junto a [[t:network.view3.mode.3d]], arriba del dibujo, abre las opciones de esta vista, y otro clic las contrae: botones que giran la vista 15°, [[t:network.view3.center]], [[t:network.view3.grid]], [[t:network.view3.snap]], [[t:network.view3.shadows]], [[t:network.view3.stems]] y la [[t:network.view3.level]] de trabajo. El menú [[t:app.menu.options]], junto a [[t:app.menu.file]], tiene la densidad de la cuadrícula ([[t:network.view3.density.fine]], [[t:network.view3.density.medium]] o [[t:network.view3.density.coarse]]) y la proyección ([[t:network.view3.persp]] u [[t:network.view3.ortho]]).</p>
<h4>Editar</h4>
<ul>
<li><b>Colocar</b>: con un tipo de la paleta, haga clic en el plano de trabajo. La unión queda en la [[t:network.view3.level]] de trabajo, que <kbd>RePág</kbd> y <kbd>AvPág</kbd> suben y bajan; <kbd>Mayús</kbd> mantiene la herramienta.</li>
<li><b>Tuberías</b>: la tubería sigue en horizontal, en el plano de su último punto; mantenga <kbd>Mayús</kbd> para subir o bajar y <kbd>Ctrl</kbd> para fijarla en el eje más cercano; <kbd>Alt</kbd>+clic o <kbd>D</kbd> hace un quiebre; cerca de una unión, <kbd>←</kbd> y <kbd>→</kbd> eligen el trazado hasta ella; un clic en el vacío termina la tubería en un nudo nuevo.</li>
<li><b>Mover</b>: arrastre una unión en horizontal; con <kbd>Mayús</kbd>, en vertical (cambia su cota).</li>
<li><b>Quiebres</b>: con una tubería seleccionada, arrastre un quiebre, haga doble clic en la tubería para insertar otro, o marque uno y pulse <kbd>Supr</kbd>.</li>
<li><b>Extremos de las tuberías</b>: con una tubería seleccionada, arrastre el tirador de un extremo hasta otra unión, o lejos para dejarlo suelto; <kbd>Mayús</kbd> lo mueve hacia arriba y hacia abajo. Un extremo suelto es un anillo: arrástrelo hasta una unión. Vea [[go:draw.connect|Desconectar y reconectar tuberías]].</li>
</ul>
<p>Mirando de frente, desde atrás o de lado, el piso se ve de perfil; por eso colocar, dibujar y mover usan el plano vertical de frente a la cámara.</p>`,
          },
          symbols: {
            title: 'Símbolos y panel 3D',
            body: `<p>En la vista 3D, cada unión es un pequeño sólido: un tanque abierto con su líquido, una bomba con su motor y una flecha en el sentido del flujo, una válvula con su volante, una válvula de control con su actuador, un orificio entre bridas, una boquilla con gotas, una esfera para el nudo, un tambor (Q), una esfera (P) y un bloque (K). Siguen la dirección de sus tuberías y se ponen rojos cuando la unión bloquea el flujo, como una válvula cerrada o una bomba apagada y cerrada.</p>
<p>Con la vista 3D abierta, el panel suma la sección [[t:inspector.view3.title]]:</p>
<ul>
<li>sin nada seleccionado (el panel abierto por su flecha): [[t:inspector.view3.zScale]], [[t:inspector.view3.autoScale]] y [[t:inspector.view3.fitAll]];</li>
<li>en una tubería: la longitud dibujada (que no entra en el cálculo), los quiebres, [[t:inspector.view3.snap]], [[t:inspector.view3.fit]], [[t:inspector.view3.nextRoute]] y [[t:inspector.view3.removeBends]];</li>
<li>en una unión: X e Y en la planta y, en los tipos orientados, [[t:inspector.view3.roll]], que gira el símbolo alrededor de su tubería, y [[t:inspector.view3.auto]].</li>
</ul>
<p>Todas las teclas están en [[act:shortcuts|Atajos de teclado]].</p>`,
          },
        },
      },

      files: {
        title: 'Archivos e idioma',
        sections: {
          files: {
            title: 'Archivos',
            body: `<table>
<tr><th>Comando en [[t:app.menu.file]]</th><th>Qué hace</th></tr>
<tr><td>[[t:app.menu.new]]</td><td>Empieza un modelo vacío (se puede deshacer).</td></tr>
<tr><td>[[t:app.menu.open]]</td><td>Abre un modelo guardado en .json, o importa un modelo en los formatos .fth o .aro (abajo). Arrastrar el archivo a la ventana hace lo mismo.</td></tr>
<tr><td>[[t:app.menu.save]]</td><td>Descarga el modelo como <code>título.pumpit.json</code>, con todos sus escenarios y su dibujo.</td></tr>
<tr><td>[[t:app.menu.copyJson]] y [[t:app.menu.pasteJson]]</td><td>Copia el modelo como texto, o abre un modelo pegado como texto — útil para enviarlo en un mensaje.</td></tr>
<tr><td>[[t:app.menu.exportXlsx]]</td><td>Genera un archivo .xlsx con una hoja para cada tabla de resultados, en las columnas y unidades elegidas.</td></tr>
<tr><td>[[t:app.menu.examples]]</td><td>Abre los modelos de ejemplo.</td></tr>
</table>
<p>El modelo también se guarda automáticamente en el navegador en cada cambio. Los modelos de versiones anteriores se convierten al abrirlos: los tipos de unión eliminados pasan al equivalente más cercano, y un mensaje informa lo que cambió.</p>
<h4>Modelos en el formato .fth</h4>
<p>[[t:app.menu.open]] también lee archivos <code>.fth</code>, un formato de texto de modelos de redes de tuberías. Cuando el archivo tiene varios escenarios, una ventana los lista (con sus descripciones, marcando los que tienen resultados guardados y los que no tienen red, que no se pueden elegir): entra el que usted elija, reconstruido a partir del escenario base. El propio escenario base puede estar vacío, con la red solo en los escenarios derivados de él. Para traer otro, abra el archivo de nuevo.</p>
<p>Tuberías, uniones, cotas, unidades y dibujo entran con lo que el modelo necesita para calcular:</p>
<ul>
<li>tuberías y válvulas abiertas y cerradas, válvulas de control con su tipo, punto de ajuste y estado fijo, y bombas encendidas o apagadas, con su velocidad y la curva de la configuración en uso;</li>
<li>reservorios con el nivel del líquido, la presión en la superficie y, para cada tubería, su K y su profundidad bajo la superficie, válvulas de salida con su presión de salida y boquillas con su factor K;</li>
<li>el fluido del archivo y su presión ambiente, la referencia de las presiones manométricas.</li>
</ul>
<p>Después, un informe muestra cómo se compara el primer cálculo con los resultados guardados en el archivo, lo que necesita su intervención (dejado en blanco y marcado en rojo en la lista de verificación), lo que se asumió, lo que quedó fuera (módulos adicionales, transferencia de calor) y lo que se leyó. Las pérdidas detalladas de las tes vienen del punto de operación guardado, y algunas lecturas del formato aún por confirmar tienen una nota cada una. Use la importación para sus propios modelos.</p>
<h4>Modelos en el formato .aro</h4>
<p>[[t:app.menu.open]] también lee archivos <code>.aro</code>, el mismo tipo de formato de texto para redes de gas. El modelo entra en el modo compresible, con el escenario que usted elija, como en un archivo .fth:</p>
<ul>
<li>el gas con los datos del archivo (masa molar, k por su calor específico, viscosidad a la temperatura de las fuentes y Z por la correlación de Pitzer–Abbott; en una mezcla, estimados por sus componentes) y el modelo térmico: isotérmico cuando todas las tuberías lo son, adiabático en los demás casos;</li>
<li>reservorios, presiones y caudales impuestos con la temperatura de su gas, válvulas, válvulas de salida, válvulas de control de caudal y de presión, y compresores de caudal fijo o por curva, convertida en la altura × caudal de succión de Pump It;</li>
<li>caudales en masa, en volumen en las condiciones locales o en las normales; los volúmenes estándar pasan a normales por las condiciones estándar del archivo.</li>
</ul>
<p>Sigue el mismo informe, que compara el primer cálculo con los resultados guardados y lista lo que necesita de usted, lo que se supuso y lo que quedó fuera (intercambio de calor, módulos adicionales).</p>`,
          },
          language: {
            title: 'Idioma y números',
            body: `<p>El selector de la esquina superior derecha cambia toda la interfaz entre <b>Português</b>, <b>English</b> y <b>Español</b>, sin recargar la página: menús, paneles, tablas, gráficos, avisos y esta ayuda. La elección queda guardada, y en la primera visita la aplicación sigue el idioma del navegador.</p>
<ul>
<li>Los números siguen el idioma (coma o punto decimal); al escribir, los dos sirven.</li>
<li>Los nombres que usted escribe — título, objetos, escenarios — nunca se traducen.</li>
<li>Un ejemplo todavía no modificado se rehace en el nuevo idioma.</li>
</ul>`,
          },
          shortcuts: {
            title: 'Atajos de teclado',
            body: `<p>Los atajos principales, que valen fuera de los campos de texto:</p>
<table>
<tr><td><kbd>F1</kbd></td><td>Abre esta ayuda</td></tr>
<tr><td><kbd>V</kbd> · <kbd>P</kbd></td><td>Herramientas [[t:network.palette.select]] y [[t:network.palette.pipe]]</td></tr>
<tr><td><kbd>1</kbd> · <kbd>2</kbd></td><td>Vistas [[t:network.view3.mode.2d]] y [[t:network.view3.mode.3d]]</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Suelta la tubería en curso y luego sale de la herramienta</td></tr>
<tr><td><kbd>Supr</kbd></td><td>Elimina la selección</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd> · <kbd>Ctrl</kbd>+<kbd>Y</kbd></td><td>Deshacer · rehacer</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>C</kbd> · <kbd>Ctrl</kbd>+<kbd>V</kbd> · <kbd>Ctrl</kbd>+<kbd>A</kbd></td><td>Copiar · pegar · seleccionar todo</td></tr>
<tr><td><kbd>Inicio</kbd> · <kbd>+</kbd> · <kbd>−</kbd></td><td>Encuadrar · acercar · alejar</td></tr>
</table>
<p>La lista completa, con las teclas de la vista 3D: [[act:shortcuts|Atajos de teclado]].</p>`,
          },
        },
      },

      tech: {
        title: 'Referencia técnica',
        sections: {
          overview: {
            title: 'Hipótesis y magnitudes',
            body: `<p>Pump It resuelve el flujo en <b>régimen permanente</b> de un <b>líquido incompresible</b> en una red de tuberías y componentes (para gases, el modo compresible tiene su propia [[go:gasTech.properties|referencia técnica]]), con estas hipótesis:</p>
<ul>
<li>propiedades del fluido constantes, evaluadas a una sola temperatura, sin transferencia de calor;</li>
<li>flujo unidimensional y plenamente desarrollado en cada tubería, con pérdidas por Darcy-Weisbach (o Hazen-Williams);</li>
<li>componentes concentrados en las uniones, con pérdidas localizadas o con características propias (curva de bomba, control);</li>
<li>sin transitorios (golpe de ariete), compresibilidad ni flujo bifásico — una presión por debajo de la de vapor solo genera un aviso.</li>
</ul>
<h4>Magnitudes</h4>
<p>Internamente todo está en el SI, y las presiones son <b>absolutas</b>. La variable de presión en los nudos es la <b>presión de estancamiento</b> (total), donde <i>p</i> es la presión estática:</p>
[[eq:stagnation]]
<p>Las cargas se calculan con la presión absoluta:</p>
[[eq:heads]]
<p>La cota <i>z</i> de cada punto es la cota de su unión, o la cota de conexión indicada. Los caudales son caudales másicos <i>ṁ</i>; el caudal volumétrico es <i>Q</i> = <i>ṁ</i>/<i>ρ</i>.</p>`,
          },
          network: {
            title: 'Modelo de la red',
            body: `<p>El modelo se convierte en un grafo de <b>nudos</b> y <b>enlaces</b>:</p>
<ul>
<li>Las uniones de un solo nudo (reservorio, presión impuesta, caudal impuesto, boquilla, nudo, válvula de salida) son un nudo. La boquilla y la válvula de salida reciben además un nudo externo, de presión fija, y un enlace de descarga hasta él.</li>
<li>Los componentes de dos puertos (bomba, válvulas, orificio, componente genérico) se convierten en un nudo de entrada, un nudo de salida y un enlace entre ellos.</li>
<li>Cada tubería es un enlace entre los nudos de sus extremos.</li>
</ul>
<p>Las incógnitas son el caudal másico de cada enlace y la presión de estancamiento de cada nudo.</p>
<h4>Ecuaciones de los nudos</h4>
<p>En un nudo libre vale la continuidad, donde ṁ<sub>dem</sub> es la demanda del nudo (un caudal impuesto o la fuente de un nudo, con su signo):</p>
[[eq:continuity]]
<p>En un nudo de presión fija (reservorio, presión impuesta, nudo externo), la presión es conocida — la de estancamiento, o la estática de la tubería unida:</p>
[[eq:fixedNode]]
<h4>Ecuaciones de los enlaces</h4>
<p>En un enlace con pérdida (tubería, válvula, orificio, bomba, descarga), la energía entre los extremos <i>a</i> y <i>b</i> es:</p>
[[eq:linkLoss]]
<p>Δp(ṁ) es la pérdida del enlace, con el signo del flujo; en una bomba es negativa, una ganancia. El término de gravedad existe en las tuberías, que unen cotas diferentes. Según su estado, un enlace puede tener otra ecuación: caudal nulo (cerrado), caudal fijo (bomba de caudal fijo, control de caudal), presión estática fija aguas abajo o aguas arriba (control de presión) o diferencia de presión fija (control de ΔP).</p>
<h4>Unicidad</h4>
<p>Antes de resolver, la aplicación separa las partes conectadas de la red. Cada parte necesita una referencia de presión. Una parte sin referencia y sin caudal forzado queda aislada (caudal cero, presión indefinida); con caudal forzado y sin referencia, el cálculo se rechaza.</p>`,
          },
          newton: {
            title: 'Método de solución',
            body: `<p>El sistema se resuelve por el <b>método de Newton-Raphson</b> sobre todas las incógnitas a la vez — el mismo sistema del método del gradiente de Todini y Pilati (1988), que extiende la formulación de Jeppson (1976) a redes con componentes:</p>
[[eq:newtonStep]]
<p><i>R</i> es el vector de residuos de las ecuaciones de los nudos y de los enlaces, y <i>J</i> es la matriz jacobiana. Las derivadas de las pérdidas son numéricas, por diferencias centrales, con un valor mínimo que evita una jacobiana singular con caudal nulo:</p>
[[eq:jacobian]]
<p>El sistema lineal se resuelve por eliminación de Gauss, con equilibrado de filas y pivoteo parcial.</p>
<h4>Estimación inicial</h4>
<p>1 m/s en todas las tuberías, en el sentido de referencia, y, en los nudos, el promedio de las presiones fijas. Cuando un dispositivo cambia de estado, la solución anterior pasa a ser la nueva estimación.</p>
<h4>Relajación y búsqueda lineal</h4>
<p>El paso aplicado es α·Δx, con α igual a la relajación. Con la relajación adaptativa, α se reduce a la mitad (hasta 10 veces) mientras la norma de los residuos escalados no baje lo suficiente; cerca de la solución, el paso completo siempre se acepta:</p>
[[eq:lineSearch]]
<h4>Convergencia</h4>
<p>El criterio usa el paso de Newton completo, y no el relajado, para no confundir un paso pequeño con la convergencia:</p>
[[eq:convergence]]
<p>ε<sub>i</sub> es un mínimo absoluto para caudales y presiones cercanos a cero. El criterio debe cumplirse en dos iteraciones seguidas.</p>
<h4>Dispositivos con estado</h4>
<p>Las válvulas de control tienen estados (controlando, totalmente abierta, cerrada). Después de cada convergencia, la aplicación revisa los estados; si alguno cambió, resuelve de nuevo, hasta 50 pasadas. Si los estados entran en ciclo, el cálculo se detiene con un aviso de que no es posible una solución única.</p>
<h4>Verificación de masa</h4>
<p>Con la verificación activada, la conservación de la masa se comprueba en cada nudo libre: un desbalance mayor que la tolerancia relativa por el caudal del nudo genera un aviso.</p>`,
          },
          friction: {
            title: 'Fricción en las tuberías',
            body: `<p>La velocidad media y el número de Reynolds de cada tubería (N tuberías iguales en paralelo se reparten el caudal):</p>
[[eq:velocity]]
<p>La pérdida distribuida sigue Darcy-Weisbach:</p>
[[eq:darcy]]
<h4>Factor de fricción</h4>
<p><b>Laminar</b> (<i>Re</i> &lt; Re<sub>lam</sub>, 2300 por defecto): Hagen-Poiseuille.</p>
[[eq:laminar]]
<p><b>Turbulento</b> (<i>Re</i> &gt; Re<sub>turb</sub>, 4000 por defecto): la ecuación de Colebrook en su forma original (constantes 1,14 y 9,35), resuelta por iteración hasta una precisión de 10⁻¹³:</p>
[[eq:colebrook]]
<p><b>Transición</b>: interpolación lineal en <i>Re</i> entre el valor laminar en Re<sub>lam</sub> y el de Colebrook en Re<sub>turb</sub>:</p>
[[eq:transition]]
<p>El modelo hidráulicamente liso usa ε = 0; un factor indicado vale en todos los regímenes; sin fricción, Δp<sub>f</sub> = 0.</p>
<h4>Hazen-Williams</h4>
<p>No depende de la viscosidad ni del régimen. El coeficiente <i>k</i> se calibró contra resultados de referencia (el clásico 0,8492 da una pérdida cerca de 0,1% menor):</p>
[[eq:hazen]]
<h4>Secciones no circulares</h4>
<p>Todas las fórmulas usan el diámetro hidráulico — para la sección circular, el anillo, el rectángulo de lados <i>a</i> y <i>b</i> o el área y el perímetro indicados:</p>
[[eq:hydraulicDiameter]]
<p>La incrustación reduce el diámetro hidráulico y el área (<i>r</i> es la reducción como fracción):</p>
[[eq:fouling]]`,
          },
          minor: {
            title: 'Pérdidas localizadas',
            body: `<p>Toda pérdida localizada usa un coeficiente K sobre la presión dinámica:</p>
[[eq:minor]]
<ul>
<li><b>Accesorios de la tubería</b>: los K se suman y usan la velocidad de la propia tubería. Los ítems del Crane TP-410 se dan por K/f<sub>T</sub>, con el f<sub>T</sub> del acero comercial limpio, totalmente turbulento, en el diámetro interior real:</li>
</ul>
[[eq:fittingsSum]]
[[eq:craneFT]]
<ul>
<li><b>Pérdidas en los extremos</b> (tabla de pérdidas por tubería): el K de salida de la unión o de llegada a ella, cada uno con la velocidad de su propia tubería y solo en el sentido correspondiente.</li>
<li><b>Componentes de dos puertos</b>: el K se refiere a la tubería aguas arriba, según el sentido del flujo.</li>
</ul>
<h4>Corrección laminar de los K</h4>
<p>Los K de catálogo valen para flujo turbulento. Por debajo de Re<sub>turb</sub>, la corrección ([[t:inspector.system.craneFt]] por defecto) aumenta el K en proporción al factor de fricción laminar:</p>
[[eq:laminarK]]
[[eq:laminarKTransition]]
<p>f<sub>ref</sub> es el f<sub>T</sub> del Crane en el diámetro de la tubería ([[t:inspector.system.craneFt]]) o el factor de fricción totalmente turbulento de la propia tubería, según su rugosidad ([[t:inspector.system.pipeFt]]). La interpolación mantiene la pérdida continua en Re<sub>lam</sub> y en Re<sub>turb</sub>. Con la opción [[t:inspector.system.noCorrection]], el K se usa tal como se indicó.</p>`,
          },
          pumps: {
            title: 'Bombas',
            body: `<h4>Curva</h4>
<p>Los puntos indicados se ajustan por mínimos cuadrados (polinomio de orden 0 a 4) o se unen por interpolación lineal, con extrapolación lineal en los extremos. El cálculo siempre usa la curva ajustada:</p>
[[eq:polyfit]]
<p>La curva indicada vale para el 100% de la velocidad y una bomba. Para la velocidad relativa <i>s</i> y N bombas iguales en paralelo, valen las leyes de afinidad:</p>
[[eq:pumpCurve]]
<p>En la red, la bomba es un enlace cuya "pérdida" es la ganancia de carga, con signo negativo:</p>
[[eq:pumpLink]]
<h4>Modos</h4>
<p>Con caudal fijo, la ecuación del enlace pasa a ser ṁ = valor, y la altura necesaria sale del cálculo. El control de caudal funciona igual, con el caudal de ajuste; en los controles de presión, se fija la presión estática en la impulsión (o en la succión). En los modos de control, la velocidad necesaria se halla por bisección:</p>
[[eq:pumpSpeed]]
<h4>Potencia y NPSH</h4>
[[eq:pumpPower]]
<p>La eficiencia η sale de la curva de eficiencia, leída en el caudal equivalente por bomba al 100% (Q/(N·s)); sin ella, η = 1. El NPSH disponible usa la presión de estancamiento absoluta en la succión:</p>
[[eq:npsh]]
<h4>Curva del sistema</h4>
<p>El gráfico Bomba × sistema ejecuta el solver con la bomba a caudal fijo, desde cero hasta el 125% del caudal máximo de la curva (escalado por la velocidad y por el número de bombas), y registra la altura exigida en cada punto.</p>`,
          },
          valves: {
            title: 'Válvulas, orificios y boquillas',
            body: `<h4>Válvula</h4>
<p>Con K, la pérdida usa la velocidad en la tubería aguas arriba:</p>
[[eq:valveK]]
<p>Con Cv (EE. UU., densidad relativa al agua a 60 °F, 999,0 kg/m³) o Kv (métrico, relativo a 1000 kg/m³):</p>
[[eq:cv]]
<p>Los resultados traen el Cv equivalente al caudal y a la caída calculados:</p>
[[eq:cvEquivalent]]
<h4>Válvula de control</h4>
<p>Mientras controla, el enlace deja de tener pérdida e impone la presión aguas abajo (PRV) o aguas arriba (PSV), estática o de estancamiento, el caudal (FCV) o la caída de presión (PDCV). Totalmente abierta, vale la pérdida con el K de válvula abierta; cerrada, ṁ = 0. Después de cada convergencia se revisan los estados:</p>
<ul>
<li>una PRV o PSV que controla pasa a <b>cerrada</b> si su caudal se vuelve negativo, y a <b>totalmente abierta</b> si la caída exigida es menor que la pérdida con la válvula abierta (excepto con [[t:junctions.control.form.alwaysControl]]);</li>
<li>totalmente abierta, vuelve a controlar cuando la presión aguas abajo supera el ajuste (PRV), cuando la de aguas arriba queda por debajo de él (PSV) o cuando el caudal supera el ajuste (FCV);</li>
<li>una FCV que no logra controlar sigue la elección [[t:junctions.control.form.failAction]].</li>
</ul>
<h4>Válvula de salida</h4>
[[eq:exitValve]]
<p>La pérdida de la válvula usa K (sobre la velocidad de la tubería), Cv o Kv.</p>
<h4>Orificio</h4>
<p>Por las correlaciones de Idelchik, con A<sub>1</sub> el área aguas arriba, A<sub>2</sub> la de aguas abajo y A<sub>o</sub> la del orificio. Borde vivo:</p>
[[eq:orificeSharp]]
<p>Borde redondeado, de radio <i>r</i>, entre tuberías de igual área (con áreas diferentes, la fórmula suma los términos de expansión):</p>
[[eq:orificeRounded]]
<p>Por coeficiente de descarga, ya referido a la tubería aguas arriba:</p>
[[eq:orificeCd]]
<h4>Boquilla / aspersor</h4>
[[eq:spray]]
[[eq:sprayArea]]
<p>El factor K de catálogo supone agua; para otro fluido, indique Cd y el área.</p>
<h4>Componente genérico</h4>
<p>Con K, funciona como la válvula. Con curva, la caída sale de la curva ajustada a los puntos ΔP × caudal:</p>
[[eq:genericCurve]]`,
          },
          boundaries: {
            title: 'Contornos',
            body: `<ul>
<li><b>Reservorio</b>: un nudo de presión fija igual a la presión en la superficie, en la cota del nivel del líquido. Cada tubería se une en la cota del fondo o en su propia conexión, dada como cota o como profundidad bajo el nivel (cota = nivel − profundidad); si la conexión está por encima del nivel, la tubería descarga en caída libre, y la presión de contorno vale en el extremo de la tubería.</li>
<li><b>Presión impuesta</b>: un nudo de presión de estancamiento fija; en el tipo estático, se fija p = P<sub>0</sub> − ½ρV² de la única tubería.</li>
<li><b>Caudal impuesto</b> y <b>fuente de un nudo</b>: entran en la continuidad como demanda (positiva sale, negativa entra).</li>
<li><b>Boquilla</b> y <b>válvula de salida</b>: un nudo externo de presión fija (la externa o la residual), unido por un enlace de descarga.</li>
</ul>
<p>El caudal neto de cada contorno aparece en [[t:app.tabs.out]] → [[t:results.tabs.general]] → [[t:results.boundaries.title]], positivo cuando entra en la red.</p>`,
          },
          fluid: {
            title: 'Propiedades del agua',
            body: `<p>Para el agua, las propiedades salen de correlaciones públicas, válidas de 0 a 150 °C (fuera de ese rango aparece un aviso). Densidad, según Kell (1975), con <i>t</i> en °C y ρ en kg/m³:</p>
[[eq:kell]]
<p>Viscosidad dinámica, según la ecuación de Vogel, con <i>T</i> en K:</p>
[[eq:vogel]]
<p>Presión de vapor, según la ecuación de saturación de la IAPWS-IF97, región 4, con <i>T</i> en K, n<sub>1</sub>…n<sub>10</sub> los coeficientes de la norma, A = θ² + n<sub>1</sub>θ + n<sub>2</sub>, B = n<sub>3</sub>θ² + n<sub>4</sub>θ + n<sub>5</sub> y C = n<sub>6</sub>θ² + n<sub>7</sub>θ + n<sub>8</sub>:</p>
[[eq:iapws]]
<p>Con un fluido definido por el usuario, ρ, μ y Pv son los indicados. La presión de vapor solo entra en los avisos (presión estática por debajo de ella en una tubería) y en el NPSH disponible.</p>`,
          },
          outputs: {
            title: 'Resultados derivados',
            body: `<ul>
<li><b>Presiones en las tuberías</b>: P<sub>0</sub> a la entrada y a la salida ya descuentan las pérdidas en los extremos; la presión estática es P<sub>0</sub> − ½ρV².</li>
<li><b>Pérdida de carga</b> h<sub>L</sub>: las pérdidas por fricción, accesorios y extremos, en altura.</li>
<li><b>Caída de presión total</b>: ΔP<sub>0</sub> = P<sub>0</sub> a la entrada − P<sub>0</sub> a la salida, incluida la gravedad.</li>
<li><b>Régimen</b>: laminar por debajo de Re<sub>lam</sub>, turbulento por encima de Re<sub>turb</sub> y transición entre ellos.</li>
<li><b>K efectivo</b> de un componente de dos puertos: la caída de estancamiento dividida por la presión dinámica a la entrada.</li>
</ul>
[[eq:effectiveK]]
<ul>
<li><b>Bombas</b>: ΔH, potencias, eficiencia y NPSH, como en [[go:tech.pumps|Bombas]].</li>
<li><b>K en la tabla de tuberías</b>: la suma de los K de los accesorios, sobre el área de la tubería, sin la corrección laminar.</li>
</ul>
<p>También salen avisos de cavitación (presión estática por debajo de la de vapor), de tubería más corta que el desnivel que vence, de tubería por encima del nivel tomando líquido de un reservorio y de flujo en contra del sentido de referencia en un componente, además de los avisos de bombas, válvulas y convergencia.</p>
<h4>Salidas de la ventana de columnas</h4>
<ul>
<li><b>Pérdidas de una tubería</b>: fricción, accesorios y extremos (el K de la unión en cada extremo) suman la pérdida de carga h<sub>L</sub>. La caída de estancamiento es la caída debida a la cota, ρ·g·(z<sub>salida</sub> − z<sub>entrada</sub>), más fricción y accesorios, porque P<sub>0</sub> a la entrada y a la salida ya descuentan los extremos. La pérdida de carga unitaria es h<sub>L</sub>/L; la pérdida de presión por longitud, ρ·g·h<sub>L</sub>/L.</li>
<li><b>Líneas de carga</b>: HGL = P/(ρg) + z y EGL = P<sub>0</sub>/(ρg) + z, con la presión absoluta, como en el gráfico de perfil; incluyen la altura de la atmósfera (cerca de 10,3 m de agua).</li>
<li><b>Mayor y menor presión estática</b> de una tubería: las de sus extremos, porque la presión de un líquido varía en línea recta entre ellos; para un gas, también los puntos de su perfil.</li>
<li><b>Rugosidad relativa</b> ε/D, en los modelos con rugosidad; ninguna para Hazen-Williams, f dado o sin fricción.</li>
<li><b>Uniones</b>: el ΔP estático entre las dos tuberías de un componente y su pérdida de carga ΔP<sub>0</sub>/(ρg); el caudal neto hacia la red en una frontera, con el signo de [[t:results.boundaries.title]].</li>
<li><b>Bombas</b>: las presiones de succión y de descarga de la unión de la bomba; el margen de NPSH, NPSH<sub>D</sub> − NPSH<sub>R</sub>, y la relación NPSH<sub>D</sub>/NPSH<sub>R</sub>. El <b>punto de mejor eficiencia</b> (BEP) es el caudal del pico de la curva de eficiencia, entre su primer y su último punto, llevado al punto de operación por las leyes de afinidad: Q<sub>BEP</sub> = N·n·Q<sub>pico</sub>, con N bombas a la velocidad n. Una curva cuyo punto más alto es uno de sus extremos no da BEP.</li>
<li><b>Válvulas</b>: K<sub>v</sub> = 0,8645·C<sub>v</sub> (C<sub>v</sub> en gpm con ΔP en psi y agua a 60 °F; K<sub>v</sub> en m³/h con ΔP en bar).</li>
</ul>`,
          },
          references: {
            title: 'Validación y referencias',
            body: `<h4>Validación</h4>
<p>Pruebas automáticas comprueban el cálculo frente a soluciones independientes: una tubería única (Colebrook resuelto analíticamente), Hazen-Williams, el punto de operación de una bomba por bisección (también al 80% de la velocidad), la curva del sistema, tres reservorios y una red mallada (continuidad y energía), una válvula reductora que mantiene su ajuste y abre en la punta, control de caudal, una válvula de salida con solución analítica, una bomba de caudal fijo, aspersores y todos los ejemplos. Comparados con resultados de referencia de casos de verificación, los desvíos máximos fueron de 5·10⁻⁵ en Darcy-Weisbach y 2,5·10⁻⁵ en Hazen-Williams.</p>
<h4>Fuera de alcance</h4>
<p>Transitorios (golpe de ariete), transferencia de calor, fluidos no newtonianos, flujo bifásico y costos.</p>
<h4>Referencias</h4>
<ul>
<li>Todini, E.; Pilati, S. (1988). A gradient algorithm for the analysis of pipe networks.</li>
<li>Jeppson, R. W. (1976). <i>Analysis of Flow in Pipe Networks</i>.</li>
<li>Colebrook, C. F. (1939). Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws.</li>
<li>Moody, L. F. (1944). Friction factors for pipe flow.</li>
<li>White, F. M. <i>Fluid Mechanics</i>, tabla 6.1 (rugosidades típicas).</li>
<li>Crane Co. <i>Flow of Fluids Through Valves, Fittings and Pipe</i>, Technical Paper 410 (método K/f<sub>T</sub>).</li>
<li>Idelchik, I. E. <i>Handbook of Hydraulic Resistance</i> (orificios).</li>
<li>Kell, G. S. (1975). Density, thermal expansivity and compressibility of liquid water from 0 to 150 °C.</li>
<li>Vogel, H. (1921). Ecuación de temperatura de la viscosidad de los líquidos.</li>
<li>IAPWS-IF97, región 4 (presión de saturación del agua).</li>
<li>ASME B36.10M (dimensiones de tubos de acero).</li>
<li>ASME B36.19M-2018 (dimensiones de tubos de acero inoxidable), en la tabla del Hydraulic Institute.</li>
<li>ISO 4427-2 y ABNT NBR 15561 (dimensiones de tubos de PEAD); ISO 4065 (tabla universal de espesores de pared).</li>
<li>ISO 2531 y ABNT NBR 7675 (dimensiones de tubos de hierro dúctil y revestimiento de mortero de cemento).</li>
<li>Hydraulic Institute. <i>Engineering Data Book</i> (rugosidad del acero inoxidable).</li>
<li>Saint-Gobain PAM, datos técnicos del revestimiento de mortero de cemento (rugosidad del hierro dúctil revestido).</li>
</ul>`,
          },
        },
      },

      gas: {
        title: 'Gas (modo compresible)',
        sections: {
          concept: {
            title: 'El modo compresible',
            body: `<p>Pump It calcula redes de <b>líquido</b> y de <b>gas</b>. La elección es el <b>régimen</b> del modelo, arriba de la ventana [[t:inspector.system.title]]: [[t:inspector.system.regimes.incompressible]] o [[t:inspector.system.regimes.compressible]]. El sello junto al título del modelo [[show:stamp|muestra siempre el régimen en uso]]; un clic en él abre esa ventana.</p>
<h4>Cuándo un gas es compresible</h4>
<p>En el modo compresible la densidad cambia con la presión y la temperatura a lo largo de cada tubería, el gas acelera mientras se expande y puede llegar a la velocidad del sonido. Úselo cuando:</p>
<ul>
<li>el número de Mach supera 0,3 en alguna tubería; o</li>
<li>la caída de presión supera el 10 % de la presión absoluta de entrada, incluso con Mach bajo.</li>
</ul>
<p>Por debajo de eso, el modo incompresible con la densidad del gas comete un error pequeño. La app ayuda en los dos sentidos: en el modo incompresible, un fluido liviano como un gas que supera esos límites genera un aviso que sugiere el compresible; en el compresible, cuando todo queda por debajo de Mach 0,1 y del 2 % de caída, una información recuerda que el incompresible daría prácticamente lo mismo.</p>
<h4>Nada se pierde al cambiar</h4>
<p>Cada régimen guarda su fluido: el líquido de un lado, el gas del otro. Cambiar de régimen recalcula al instante, sin borrar datos. Se pueden comparar los dos, incluso con un [[go:scenarios.concept|escenario]] que cambie solo el régimen o el modelo térmico. El dibujo, las uniones, las tuberías y las vistas son los mismos.</p>
<p class="tip">Para empezar, abra [[act:example:air]], una línea de aire comprimido que pierde el 42 % y el 50 % de la presión absoluta hasta sus dos consumos, o [[act:example:airPlant]], con compresor, válvula reductora y boquilla de limpieza.</p>`,
          },
          setup: {
            title: 'Gas, temperatura y modelo térmico',
            body: `<p>En el régimen compresible, la ventana del sistema muestra la sección [[t:inspector.system.gas]]:</p>
<ul>
<li>[[t:inspector.system.gasMode]]: <b>[[t:inspector.system.gasModes.isothermal]]</b> mantiene la temperatura constante en toda la red (líneas largas que intercambian calor con el ambiente); <b>[[t:inspector.system.gasModes.adiabatic]]</b> no intercambia calor: la temperatura de estancamiento se conserva en cada tubería y el gas se enfría al acelerar (líneas cortas o aisladas).</li>
<li>[[t:inspector.system.gasKind]]: aire, nitrógeno, oxígeno, metano, gas natural (aproximado), CO₂ e hidrógeno, con masa molar y k de valores públicos y viscosidad por la ley de Sutherland; o [[t:inspector.system.customGas]], con la masa molar, k y la viscosidad que usted indique. Al pasar de un gas de la biblioteca al personalizado, sus valores se vuelven el punto de partida.</li>
<li>[[t:inspector.system.Z]]: 1 para un gas ideal; para un gas real, el valor en las condiciones de operación, constante en el modelo.</li>
<li>Temperatura: en el isotérmico, la del gas en toda la red; en el adiabático, la temperatura de estancamiento de las fuentes. Cada fuente puede tener la suya, como en [[go:gas.components]].</li>
</ul>
<p>Debajo aparecen la constante del gas R, la velocidad del sonido a la temperatura dada y la densidad normal.</p>
<h4>Límites de diseño</h4>
<p>[[t:inspector.system.machLimit]] (0,7 por defecto) y [[t:inspector.system.velLimit]] (30 m/s por defecto) generan avisos cuando una tubería los supera. El bloqueo sónico siempre se informa.</p>
<h4>Presiones y caudales</h4>
<p>Cada presión es manométrica o absoluta según su unidad, como en el líquido: una unidad con (g) es relativa a la [[t:inspector.system.patm]], que se le suma, pues el gas siempre se calcula en presión <b>absoluta</b>. Los resultados muestran presiones manométricas por defecto, y el selector de unidad de cada columna ofrece también las absolutas. Una presión igual o inferior al vacío (cero absoluto) no tiene sentido para un gas: queda pendiente en la [[go:start.autoCalc|lista de verificación]]. Los caudales pueden darse en masa (kg/s, kg/h, t/h…), en volumen en las condiciones del punto (m³/h, L/s…) o en volumen <b>normal</b> (Nm³/h, a 0 °C y 101,325 kPa).</p>`,
          },
          components: {
            title: 'Contornos y componentes con gas',
            body: `<p>Las uniones son las del modo incompresible. Con gas:</p>
<ul>
<li>[[icon:reservoir]] <b>Reservorio</b>: un recipiente de gas en reposo. La presión indicada es de estancamiento y vale en la cota de referencia; la columna de gas hasta cada tubería entra en el cálculo.</li>
<li>[[icon:pressure]] <b>Presión impuesta</b>: estática o de estancamiento, como usted elija.</li>
<li>[[icon:flow]] <b>Caudal impuesto</b> y [[icon:branch]] <b>nodo</b>: caudal en masa, en volumen en las condiciones del nodo o en volumen normal.</li>
<li>En el modelo adiabático, el reservorio, la presión impuesta, el caudal que entra y la fuente de un nodo tienen el campo [[t:junctions.gasT.label]]; vacío, vale la temperatura de las fuentes.</li>
<li>[[icon:valve]] <b>Válvula</b>, [[icon:generic]] <b>componente genérico</b> y [[icon:orifice]] <b>orificio</b>: las pérdidas localizadas cuentan como longitud equivalente de fricción. Cv y Kv se vuelven el K equivalente en el área de la tubería de entrada. El orificio también limita el caudal al caudal crítico de su agujero: un orificio de restricción se bloquea mucho antes que la tubería.</li>
<li>[[icon:control]] <b>Válvula de control</b>: reductora, sostenedora, de caudal y de ΔP, con los estados del líquido.</li>
<li>[[icon:spray]] <b>Boquilla</b>: flujo isentrópico por el área efectiva, que se bloquea cuando la presión exterior cae por debajo de la relación crítica (alrededor de 0,53 de la presión aguas arriba, para el aire).</li>
<li>[[icon:exitvalve]] <b>Válvula de salida</b>: la pérdida de la válvula hasta la presión exterior, donde la presión estática del chorro es la residual.</li>
<li>[[icon:pump]] <b>Bomba</b>: con gas, es un compresor o un soplador, como en [[go:gas.compressor]].</li>
</ul>
<p>El modelo de Hazen-Williams no vale para gases: esas tuberías se calculan con Darcy y la rugosidad guardada en la tubería, y un aviso las lista.</p>`,
          },
          compressor: {
            title: 'Compresores y sopladores',
            body: `<p>En el modo compresible, la [[icon:pump]] bomba es un compresor o un soplador. En [[t:junctions.pump.form.mode]]:</p>
<ul>
<li>[[t:junctions.pump.form.modes.ratio]]: la presión de estancamiento de salida es la de entrada por la relación.</li>
<li>[[t:junctions.pump.form.modes.curve]]: la curva de altura vale como <b>altura isentrópica</b> del gas contra el caudal volumétrico de succión, con las leyes de afinidad (velocidad y máquinas en paralelo). Para alturas pequeñas, como en un soplador, esto es ΔP = ρgH, la curva de una bomba.</li>
<li>[[t:junctions.pump.form.modes.fixedFlow]]: el caudal es impuesto y el cálculo muestra la relación necesaria.</li>
<li>Los modos de velocidad variable controlan el caudal, la presión estática de descarga o la de succión, y la app muestra la velocidad que pide la curva.</li>
</ul>
<p>La [[t:junctions.pump.form.etaGas]] (o la curva de eficiencia, cuando exista) dice cuánto se calienta el gas. En el modelo adiabático el gas sale más caliente y lleva esa temperatura por la red; en el isotérmico se supone que un enfriador lo devuelve a la temperatura de la red, y la temperatura de descarga solo se informa. Los resultados traen la relación, la altura isentrópica, la temperatura de descarga y la potencia entregada al gas. Las ecuaciones están en [[go:gasTech.machines]].</p>`,
          },
          results: {
            title: 'Resultados con gas',
            body: `<p>Los resultados de un gas traen, además de lo que vale para líquidos:</p>
<ul>
<li>El <b>caudal másico</b>, el mismo a lo largo de la tubería; el caudal volumétrico a la entrada, en las condiciones locales; y el caudal normal.</li>
<li>En cada extremo de la tubería: velocidad, <b>número de Mach</b>, presiones <b>estática</b> y <b>de estancamiento</b>, temperatura y densidad. "Entrada" y "salida" siguen el sentido de referencia de la tubería.</li>
<li>La marca de <b>bloqueo</b>: el gas llegó a la velocidad del sonido a la salida de la tubería (Mach 1/√k en el isotérmico, 1 en el adiabático). El caudal se queda en el crítico por más que baje la presión aguas abajo; el resultado muestra el estado a la salida de la tubería, antes de la expansión hasta la presión del nodo.</li>
</ul>
<p>En [[show:overlay|Resultados en el dibujo]] entran el caudal másico y el número de Mach; la línea piezométrica, una altura de líquido, sale. La velocidad del gas se colorea según el rango del propio modelo, porque la escala fija es la del agua. El gráfico de perfil traza las presiones estática y de estancamiento punto a punto dentro de cada tubería, porque la presión de un gas no cae en línea recta.</p>
<p>La tabla de tuberías empieza con las columnas de un líquido: el caudal es el caudal volumétrico a la entrada, y la velocidad es la mayor de los dos extremos, la que usan los avisos. Los valores de cada extremo, los caudales másico y normal y la marca de bloqueo están en la [[go:results.tables|ventana de columnas]], que también trae, para un gas: la velocidad del sonido a = √(k·Z·R·T) en cada extremo, las temperaturas de estancamiento, el caudal a la salida, la caída estática, las pérdidas por fricción y en los accesorios (la pérdida repartida en la razón entre f·L/D y ΣK: una estimación, porque la marcha no las separa), los caudales másico y normal netos en las fronteras y, en un compresor, las presiones de succión y de descarga, la altura isentrópica, la eficiencia politrópica y el punto de mejor eficiencia. Las alturas (HGL, EGL, pérdida de carga) no tienen sentido para un gas y no se ofrecen.</p>
<h4>Avisos</h4>
<ul>
<li><b>Crítico</b>: tubería bloqueada; cálculo que no convergió.</li>
<li><b>Aviso</b>: unión bloqueada (válvula, orificio, boquilla); Mach por encima del límite de diseño.</li>
<li><b>Precaución</b>: velocidad por encima del límite; Hazen-Williams tomado como Darcy.</li>
<li><b>Información</b>: el modo incompresible daría prácticamente el mismo resultado.</li>
</ul>`,
          },
        },
      },

      gasTech: {
        title: 'Referencia técnica del gas',
        sections: {
          properties: {
            title: 'Propiedades del gas',
            body: `<p>El gas es ideal, con factor de compresibilidad <i>Z</i> constante. Con la masa molar MW, la densidad y la constante del gas son:</p>
[[eq:gasLaw]]
<p>La velocidad del sonido, el flujo de masa <i>G</i> (caudal másico por área, constante en una tubería de área constante) y el número de Mach:</p>
[[eq:machGas]]
<p>Las magnitudes de estancamiento, las del gas frenado hasta el reposo sin pérdidas, vienen de las relaciones isentrópicas:</p>
[[eq:stagnationGas]]
<p>En los gases de la biblioteca la viscosidad sigue la ley de Sutherland, con μ₀ y S de valores públicos; se evalúa a la temperatura del gas y queda constante en la red:</p>
[[eq:sutherland]]
<p>Los caudales normales usan la densidad a 0 °C y 101,325 kPa, como gas ideal:</p>
[[eq:normalFlow]]`,
          },
          pipe: {
            title: 'La tubería: forma cerrada, Fanno y marcha',
            body: `<p>En una tubería de área constante, en régimen permanente, valen la continuidad (ρV = G), la cantidad de movimiento y la energía. El factor de fricción <i>f</i> es el de Darcy, por la misma correlación del líquido, con Re = G·D<sub>h</sub>/μ, constante a lo largo de la tubería porque G y μ lo son.</p>
<h4>Isotérmico: forma cerrada</h4>
<p>En la tubería horizontal e isotérmica, la integración da la relación exacta entre las presiones estáticas de los extremos; el logaritmo es la aceleración del gas que se expande:</p>
[[eq:isoClosed]]
<h4>Adiabático: Fanno</h4>
<p>Sin intercambio de calor, la temperatura de estancamiento se conserva y el Mach crece hacia 1. Las relaciones referidas al punto sónico (*):</p>
[[eq:fannoRel]]
[[eq:fannoLength]]
<h4>Marcha</h4>
<p>El método general divide la tubería en 100 volúmenes y resuelve en cada uno, por Newton, la cantidad de movimiento y la energía para el nuevo estado (ρ̄ y V̄ son los promedios del volumen):</p>
[[eq:marchMomentum]]
[[eq:marchEnergy]]
<p>La marcha calcula las tuberías del modelo adiabático y las tuberías con desnivel del isotérmico, donde la gravedad entra por el término ρ̄gΔz. La tubería horizontal isotérmica usa la forma cerrada, que la marcha reproduce. Cerca del bloqueo el paso se achica: cada volumen cambia el Mach como máximo en 0,005 y como máximo en el 5 % de lo que falta hasta el límite. El error frente al Fanno exacto es de 10⁻⁶ con Mach de salida 0,4, de alrededor de 2·10⁻⁴ con 0,77 y de 10⁻³ con 0,94.</p>
<h4>Pérdidas localizadas</h4>
<p>La suma de los K de la tubería, con las pérdidas de entrada y de salida de las uniones, cuenta como longitud equivalente de fricción: sumada a f·L/D en la forma cerrada y repartida a lo largo de la marcha. Válvulas, orificios y componentes genéricos son tramos de longitud nula con f·L/D = K, por la forma cerrada isotérmica o por Fanno. La corrección laminar de los K es la del líquido.</p>
[[eq:equivalentF]]`,
          },
          choking: {
            title: 'Bloqueo sónico',
            body: `<p>El caudal de una tubería tiene un máximo, alcanzado cuando el gas llega al Mach límite a la salida:</p>
[[eq:chokeLimits]]
<p>Si la presión aguas abajo pide más caudal que eso, la tubería queda <b>bloqueada</b>: el caudal es el crítico, el mayor que no se bloquea antes del final de la tubería; la presión aguas abajo deja de influir en él, y la expansión hasta la presión del nodo ocurre fuera de la tubería. La app encuentra el caudal crítico por la propia relación de la tubería.</p>
<h4>Entrada desde un recipiente</h4>
<p>Al salir de un nodo de estancamiento, como un reservorio, el gas acelera desde el reposo hasta la velocidad de la tubería de forma isentrópica. En el modelo adiabático:</p>
[[eq:entranceGas]]
<p>En el isotérmico vale la misma relación con el exponente −k/(k−1) y la temperatura del gas.</p>
<h4>Boquillas y orificios</h4>
<p>Una boquilla descarga de forma isentrópica por su área efectiva y se bloquea por debajo de la relación crítica de presiones:</p>
[[eq:nozzleGas]]
<p>Un orificio es un elemento K cuyo caudal tampoco supera el caudal crítico de su vena contracta, de área C<sub>c</sub>·A<sub>o</sub>: C<sub>c</sub> = C<sub>d</sub> en el modelo por C<sub>d</sub>, 0,61 con borde vivo, y de 0,61 a 1 con borde redondeado.</p>
[[eq:criticalFlux]]`,
          },
          network: {
            title: 'La red de gas',
            body: `<p>La topología es la del líquido. Las incógnitas son las presiones de los nodos libres; cada enlace común (tubería, válvula, orificio, boquilla) da su caudal másico a partir de las presiones de sus dos nodos, resolviendo su propia relación, con el tope del caudal crítico. En cada nodo libre cierra el balance de masa:</p>
[[eq:continuity]]
<p>Las válvulas de control, los compresores y los enlaces sin pérdida tienen el caudal como incógnita y una ecuación propia: la presión ajustada, la relación de compresión, la diferencia de presiones o el caudal impuesto.</p>
<h4>Qué presión lleva cada nodo</h4>
<p>En el modelo isotérmico las uniones llevan la <b>presión estática</b>, el método clásico de redes de gas, que desprecia la energía cinética en la unión; en el adiabático, la <b>de estancamiento</b>. Los contornos mantienen su naturaleza: el reservorio es de estancamiento, la presión impuesta es estática o de estancamiento según la elección, y la presión exterior de una boquilla o de una válvula de salida es estática. Cada tubería convierte en sus extremos.</p>
<h4>Solución</h4>
<p>Newton-Raphson sobre las presiones, con el jacobiano armado a partir de las derivadas de cada enlace, eliminación de Gauss, búsqueda lineal y presiones siempre positivas. Las primeras presiones vienen de la teoría lineal de redes de gas sobre P². El cálculo converge cuando cada nodo cierra su balance dentro de 10⁻⁸ del caudal que pasa por él. Las válvulas de control cambian de estado como con el líquido, con nuevos cálculos hasta que los estados se asientan.</p>
<h4>Temperatura en el modelo adiabático</h4>
<p>Un lazo externo actualiza las temperaturas: con los caudales, la temperatura de estancamiento de cada nodo es la mezcla, ponderada por la masa, de lo que llega a él. Las fuentes mantienen la suya, y un compresor eleva la del gas que pasa. El lazo se repite hasta que las temperaturas cambian menos de 10⁻⁶. El cálculo adiabático parte de la solución isotérmica de la misma red.</p>
[[eq:gasMixing]]`,
          },
          machines: {
            title: 'Compresores y válvulas',
            body: `<p>Con relación fija:</p>
[[eq:compRatio]]
<p>Con la curva, la altura <i>H</i> leída en el caudal volumétrico de succión, con las leyes de afinidad, es la altura isentrópica del gas:</p>
[[eq:compHead]]
<p>La temperatura de descarga, con la eficiencia politrópica η, y la potencia entregada al gas:</p>
[[eq:compHeat]]
<p>Con caudal impuesto o control de presión la relación sale del cálculo, y la velocidad que pide la curva se encuentra por bisección, como en la bomba de líquido. Las válvulas por Cv y Kv se vuelven un K equivalente en el área de la tubería de entrada, la misma pérdida que con el líquido:</p>
[[eq:gasValveK]]`,
          },
          validation: {
            title: 'Validación y límites',
            body: `<h4>Validación</h4>
<p>Pruebas automáticas verifican la física y el cálculo de redes: las propiedades del aire; la forma cerrada isotérmica en los dos sentidos; la marcha frente a la forma cerrada y a Fanno, incluida la conservación de la temperatura de estancamiento; el bloqueo en los dos modelos; el límite incompresible (con caída pequeña, la pérdida de Darcy); redes en serie y ramificadas, con su balance de masa; el ejemplo de la línea de aire comprimido frente a un cálculo independiente; el caudal crítico frente a la forma cerrada y a Fanno; la mezcla de temperaturas; boquillas y orificios bloqueados; válvulas de control; y el compresor.</p>
<h4>Fuera del alcance</h4>
<ul>
<li>mezclas de gases y cambios de composición;</li>
<li>intercambio de calor con el ambiente (el modelo es isotérmico o adiabático);</li>
<li>transitorios, ondas de choque y flujo supersónico (el cálculo llega hasta el bloqueo);</li>
<li>condensación y flujo bifásico;</li>
<li>gas real por ecuación de estado (se usa Z constante);</li>
<li>la relación crítica de presiones del obturador de una válvula (la válvula es un elemento K).</li>
</ul>
<h4>Referencias</h4>
<ul>
<li>Shapiro, A. H. (1953). <i>The Dynamics and Thermodynamics of Compressible Fluid Flow</i>.</li>
<li>Anderson, J. D. <i>Modern Compressible Flow</i>.</li>
<li>White, F. M. <i>Viscous Fluid Flow</i> (ley de Sutherland).</li>
</ul>`,
          },
        },
      },

      about: {
        title: 'Acerca de',
        sections: {
          about: {
            title: 'Acerca de Pump It',
            body: `<p><b>Pump It</b> es un simulador de redes de tuberías en régimen permanente, de líquidos (flujo incompresible) y de gases (flujo compresible), que funciona en el navegador, sin instalación y sin servidor.</p>
<p class="credit">Ideado por <b>Rafael Perktold</b>.</p>
<ul>
<li>Escrito desde cero, en <i>clean room</i>, a partir de métodos y datos públicos (vea [[go:tech.references|Validación y referencias]]). No usa marcas, nombres, íconos, textos ni pantallas de programas comerciales.</li>
<li>Interfaz en portugués, inglés y español.</li>
<li>Sus modelos quedan en su computadora: la aplicación no los envía a ningún servidor.</li>
</ul>
<p>Los resultados son una herramienta de ingeniería: revise las hipótesis, los datos de entrada y los avisos antes de usarlos en un proyecto.</p>`,
          },
        },
      },
    },
  },
});
