export const openingPromiseResolver = {
  exec: () => {},
}

// normId нужен для массивов? да, потому что с сервера они приходят в нормализованном состоянии []
const g = {
  orm: {}, // name: () => ...pathToChild[]
  desc: {}, // { name: desc },
  queries: {
    createTable: [],
  },
  door: {}, // name: door
  v: {}, // normId: item
  listner: {},
  loaders: {}, // eventId | methodId: bool
  openingPromise: new Promise((r) => {
    openingPromiseResolver.exec = r
  }),
  opened: false,
  methods: {},
  currentEventId: null,
}

export default g
