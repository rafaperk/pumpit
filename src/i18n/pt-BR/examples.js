// Example models: menu names and the texts inside each model (titles, object names, scenarios, notes).
PumpIt.i18n.add('pt-BR', {
  examples: {
    pump: {
      name: 'Bombeamento entre tanques',
      title: 'Bombeamento entre tanques',
      suctionTank: 'Tanque de sucção',
      pump: 'Bomba B-101',
      dischargeValve: 'Gaveta de recalque',
      elevatedTank: 'Caixa elevada',
      speedScenario: 'Rotação 90%',
      speedNotes: 'Mesma instalação com o inversor a 90% da rotação nominal.',
    },
    exit: {
      name: 'Recalque com pressão residual',
      title: 'Recalque com pressão residual',
      suctionWell: 'Poço de sucção',
      pump: 'Bomba de recalque',
      deliveryPoint: 'Ponto de entrega',
    },
    gravity: {
      name: 'Gravidade entre tanques',
      title: 'Gravidade entre tanques',
      dam: 'Represa',
      valve: 'Válvula',
      tank: 'Tanque',
    },
    threeRes: {
      name: 'Três reservatórios',
      title: 'Três reservatórios',
      junction: 'Junção',
    },
    loop: {
      name: 'Rede malhada (Hazen-Williams)',
      title: 'Rede malhada',
      reservoir: 'Reservatório',
    },
    prv: {
      name: 'Redutora de pressão',
      title: 'Redutora de pressão',
      highReservoir: 'Reservatório alto',
      prv: 'VRP',
      demand: 'Consumo',
      peakScenario: 'Demanda de pico',
      peakNotes: 'Consumo de pico: a pressão de montante não basta e a VRP abre totalmente.',
    },
    sprinkler: {
      name: 'Ramal de aspersores',
      title: 'Ramal de aspersores',
      supply: 'Alimentação',
      branch1: 'Derivação',
      sprinkler1: 'Aspersor 1',
      branch2: 'Derivação 2',
      sprinkler2: 'Aspersor 2',
      sprinkler3: 'Aspersor 3',
    },
  },
});
