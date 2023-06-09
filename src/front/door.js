import g from '../g.js'
import { get } from './get.js'
import { put } from './put.js'

export function door(name, descFunc, api = {}, opts) {
  const door = {
    name,
  }

  g.door[name] = door
  g.values[name] = {}
  g.desc[name] = descFunc

  for (let k in api) {
    door[k] = event(door, api[k])
  }

  return door
}

// очередь выполнения методов внутри ивентов и их количество
// на фронте и сервере одинаковы
// и мы можем использовать индекс массива
// напару с apiFnName он даёт полное представление о том, что за действие выполнено
// ведь все аргументы отправляются с первым запросом фронта

// в базу данных изменения коммитим

// door.event().method
// если ивент вызвался внутри не через event, то создастся новый ивент
// и руками отменять придётся два действия в случае ошибки одного из них

function event(door, apiFn) {
  return async function event(args) {
    // 1. делаем массив операций ивента
    // 2. при первой нехватке данных или изменении бд отправляем запрос
    // 3. в ответе получаем либо ошибку, либо результат всех операций ивента
    // 4. продолжаем выполнять ивент, по очереди забирая из ответа данные
    // 5. массив экшнов удаляем в конце ивента, неважно делали запрос или нет

    // внутри экшнов смотрим, нужно ли отправлять запрос
    // самим экшнам не нужны id, они выполняются по порядку
    // нужен флаг, пришли ли

    const eventId = g.currentEventId || Math.random()

    g.methods[eventId] = [] // [{ type: 'get', args: [] }]
    g.loaders[eventId] = true

    const api = {
      get: (id) => get(door.name, id, { eventId }),
      put: (diff) => put(door.name, diff, { eventId }),
      shareEvent: (method) => {
        g.currentEventId = eventId
        method()
        g.currentEventId = null
      },
    }

    if (!g.opened) await g.openingPromise

    // get(id) === getOne
    // get({ ...equalityFilters }, { sort: ['name.asc'], pag: [from, to] }) === get[]
    // get(ast) -> get[]

    // весь случай, когда с сервера не отправляется ответ на метод
    // это если результат метода ивента можно записать
    // опираясь исключительно на фронтовый стор

    // door.api() useEvents(currentApi, door)
    // поскольку внутри ивентов асинхронность
    // нельзя гарантировать что после then эффекта
    // выполнится сразу тело ивента, а не then другого эффекта

    // back front get put rm sql

    // мы копим на фронте лоадинги и на сервере отвечаем пачкой
    // стимул ответа - востребованность информации на фронте
    // для продолжения выполнения ивента (задержка изменения интерфейса после действия пользователя)
    // точки отправки информации с сервера на фронт - не подключенный get и back
    // либо фронт внутри ивента доходит до точки неизвестности
    // и ожидает ответ сервера со всей информацией, необходимой для дальнейшего выполнения
    // ...либо ошибку

    // на фронте есть симулированный мир будущего
    // в этом мире есть симулированные id для put и результаты rm
    // он возвращается из хуков для показа пользователю
    // он используется внутри функций ивентов
    // реальный мир так же доступен
    // симулированный мир становится реальным после подтверждения сервера
    // в случае ошибки пользователь может попробовать повторить действие

    // put на свой success получает id
    // бэку нужно знать, о каком ивенте речь, он отправляется в каждом запросе
    // так же отправляется индекс метода, и если он в ивенте последний - везде фаза успеха и очистки
    // апи внутри ивента выполняется в строго определённом порядке
    // если не хочешь загружать фронт лишней работой, ты можешь перенести расчёты внутрь back
    // в зависимости от аргументов делать пересчёты

    // 2 варианта ликвидации эффектов для передачи eventId:
    // withEventId(event)
    // и await effect(oki)
    // effect позволяет не использовать door.api()
    // но можно ошибиться, забыв этот effect
    // точно так же можно ошибиться, не заюзав withEventId внутри door

    let result
    try {
      result = await apiFn({ req: { a: args }, api })
    } catch (e) {
      console.log(e)
    }

    g.loaders[eventId] = false
    delete g.methods[eventId]

    return result
  }
}
