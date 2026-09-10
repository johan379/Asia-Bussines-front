from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import coincide_bodega, get_db, requiere_rol, usuario_actual
from app.models.produccion import Produccion
from app.models.usuario import RolUsuario, Usuario
from app.schemas.produccion import ProduccionCrear, ProduccionResponse
from app.services.produccion import registrar_produccion as aplicar_produccion

router = APIRouter(prefix="/produccion", tags=["Producción"])

@router.post("", response_model=ProduccionResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requiere_rol(RolUsuario.JEFE_PLANTA))])
def registrar_produccion(datos: ProduccionCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> Produccion:
    produccion = aplicar_produccion(db, datos, usuario)
    db.commit(); db.refresh(produccion)
    return produccion

@router.get("", response_model=list[ProduccionResponse])
def listar_producciones(db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> list[Produccion]:
    return db.query(Produccion).filter(coincide_bodega(Produccion.bodega_id, usuario.bodega_id)).order_by(Produccion.fecha.desc()).all()
