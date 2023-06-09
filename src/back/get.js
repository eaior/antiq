import { db } from './db.js'
import g from '../g.js'
import { isDoor, isPlainObject } from '../utils.js'

// на get на сервере мы в тело апи ивента отправляем результат из бд
// кроме того, мы создаём подписку на все полученные поля сущности
// и пользуемся ими в оповещениях после put
// и также можем отправить по вебсокетам на фронт результат гета
// в случае если фронт уже подключен (sessionId, разделяется между фронтами)
// ничего на него не отправляем, а обходимся результатом в тело апи ивента

// мы сохраняем результат дб в кэш и возвращаем в тело
// если получили с фронта запрос с eventId-idx, то отвечаем на него и создаём подписку
// а если на фронте уже есть это всё, при оповещении фронта об окончании eventId, оно и уничтожается
// то есть, на сервере ивент может запуститься посередине выполнения ивента фронтом
// и заканчивается он всегда по оповещению фронта

// но мы можем и высчитать последнее нужное фронту от сервера действие внутри ивента
// и удалить весь кэш на этом
// мы выполняем тело ивента и на фронте и на сервере полностью
// уведомляем фронт об ошибке и отменяем результаты в случае ошибки сервера
// предлагаем повторить запрос
// в случае ошибки фронта ничего не отменяем
// но если сервер дошел до конца метода и без информации от него
// изменения сохраняются

// для продолжения метода иногда надо подождать фронту сервер
// иногда нужно подождать серверу фронт

export async function get(name, id, res = {}) {
  await getItem(name, id, res)

  return res
}

async function getItem(name, id, res, door, desc) {
  let pk = 'id'
  if (!door) door = name
  else pk = door
  const sql = await db()
  const instQ = await sql(`select * from "${name}" where "${pk}" = ${id};`)
  const inst = instQ.rows[0]
  if (!inst) return null

  if (!desc) desc = g.desc[name]

  for (let key in desc) {
    if (isDoor(desc[key])) {
      const childName = desc[key].name
      await getItem(childName, inst[key], res)
    } else if (isPlainObject(desc[key])) {
      inst[key] = await getItem(`${name}_${key}`, id, res, door, desc[key])
    }
  }
  if (name === door) {
    if (!res[name]) res[name] = {}
    res[name][id] = inst
  }
  return inst
}
