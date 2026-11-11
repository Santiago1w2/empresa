from datetime import datetime, timedelta, timezone

ZONA = timezone(timedelta(hours=-5))


def ahora():
    return datetime.now(ZONA)


def iso(dt):
    return dt.isoformat(timespec="milliseconds")


def ahora_iso():
    return iso(ahora())


def parse_iso(texto):
    return datetime.fromisoformat(texto)


def sumar_dias_habiles(desde, dias):
    d = desde
    n = 0
    while n < dias:
        d += timedelta(days=1)
        if d.weekday() < 5:
            n += 1
    return d
