// Example models: menu names and the texts inside each model (titles, object names, scenarios, notes).
PumpIt.i18n.add('en', {
  examples: {
    pump: {
      name: 'Pumping between tanks',
      title: 'Pumping between tanks',
      suctionTank: 'Suction tank',
      pump: 'Pump P-101',
      dischargeValve: 'Discharge gate valve',
      elevatedTank: 'Elevated tank',
      speedScenario: 'Speed 90%',
      speedNotes: 'Same installation with the variable-speed drive at 90% of nominal speed.',
    },
    exit: {
      name: 'Pumping with residual pressure',
      title: 'Pumping with residual pressure',
      suctionWell: 'Suction well',
      pump: 'Delivery pump',
      deliveryPoint: 'Delivery point',
    },
    gravity: {
      name: 'Gravity flow between tanks',
      title: 'Gravity flow between tanks',
      dam: 'Dam',
      valve: 'Valve',
      tank: 'Tank',
    },
    threeRes: {
      name: 'Three reservoirs',
      title: 'Three reservoirs',
      junction: 'Junction',
    },
    loop: {
      name: 'Looped network (Hazen-Williams)',
      title: 'Looped network',
      reservoir: 'Reservoir',
    },
    prv: {
      name: 'Pressure-reducing valve',
      title: 'Pressure-reducing valve',
      highReservoir: 'High reservoir',
      prv: 'PRV',
      demand: 'Demand',
      peakScenario: 'Peak demand',
      peakNotes: 'Peak demand: the upstream pressure is not enough and the PRV opens fully.',
    },
    sprinkler: {
      name: 'Sprinkler branch line',
      title: 'Sprinkler branch line',
      supply: 'Supply',
      branch1: 'Branch',
      sprinkler1: 'Sprinkler 1',
      branch2: 'Branch 2',
      sprinkler2: 'Sprinkler 2',
      sprinkler3: 'Sprinkler 3',
    },
  },
});
