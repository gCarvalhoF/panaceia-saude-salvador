import { useCallback, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { EstablishmentCollection } from "../../types";
import EstablishmentPopup from "./EstablishmentPopup";
import { makeIcon } from "./icons/makeIcon";
import { markerColors } from "../../styles/theme";

interface Props {
  data: EstablishmentCollection;
}

const ICONS: Record<string, ReturnType<typeof makeIcon>> = {
  USF:                               makeIcon(markerColors.usf,                   "circle"),
  "Centro de Saude/Unidade Basica":  makeIcon(markerColors.ubs,                   "circle"),
  "Hospital Geral":                  makeIcon(markerColors.hospitalGeral,          "cross"),
  "Hospital Especializado":          makeIcon(markerColors.hospitalEspecializado,  "cross"),
  "Pronto Socorro Geral":            makeIcon(markerColors.prontoSocorro,          "triangle"),
  "Pronto Atendimento":              makeIcon(markerColors.prontoAtendimento,      "triangle"),
  Policlinica:                       makeIcon(markerColors.policlinica,            "circle"),
  "Centro de Atencao Psicossocial":  makeIcon(markerColors.caps,                  "circle"),
  default:                           makeIcon(markerColors.default,               "circle"),
};

const CLOSE_DELAY = 150;

function getIcon(displayType: string) {
  return ICONS[displayType] ?? ICONS.default;
}

function HoverMarker({ feature }: { feature: NonNullable<Props["data"]["features"][number]> }) {
  const [lng, lat] = feature.geometry!.coordinates;
  const props = feature.properties;
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      markerRef.current?.closePopup();
    }, CLOSE_DELAY);
  }, [cancelClose]);

  const handlePopupOpen = useCallback(() => {
    const popup = markerRef.current?.getPopup();
    const el = popup?.getElement();
    if (el) {
      el.addEventListener("mouseenter", cancelClose);
      el.addEventListener("mouseleave", scheduleClose);
    }
  }, [cancelClose, scheduleClose]);

  const handlePopupClose = useCallback(() => {
    const popup = markerRef.current?.getPopup();
    const el = popup?.getElement();
    if (el) {
      el.removeEventListener("mouseenter", cancelClose);
      el.removeEventListener("mouseleave", scheduleClose);
    }
  }, [cancelClose, scheduleClose]);

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={getIcon(props.display_type)}
      eventHandlers={{
        mouseover: () => {
          cancelClose();
          markerRef.current?.openPopup();
        },
        mouseout: scheduleClose,
        popupopen: handlePopupOpen,
        popupclose: handlePopupClose,
      }}
    >
      <Popup autoPan={false} maxWidth={256} minWidth={160} className="establishment-popup">
        <EstablishmentPopup id={props.id} />
      </Popup>
    </Marker>
  );
}

export default function EstablishmentMarkers({ data }: Props) {
  const validFeatures = data.features.filter((f) => f.geometry !== null);

  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      spiderfyOnMaxZoom
      maxClusterRadius={50}
    >
      {validFeatures.map((feature) => (
        <HoverMarker key={feature.properties.id} feature={feature} />
      ))}
    </MarkerClusterGroup>
  );
}
