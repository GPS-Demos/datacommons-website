/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";

import { PageData } from "../chart/types";
import { NlSearchBar } from "../components/nl_search_bar";
import { loadLocaleData } from "../i18n/i18n";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_PLACE_PAGE,
  triggerGAEvent,
} from "../shared/ga_events";
import { ChildPlace } from "./child_places_menu";
import { MainPane, showOverview } from "./main_pane";
import { Menu } from "./menu";
import { PageSubtitle } from "./page_subtitle";
import { ParentPlace } from "./parent_breadcrumbs";
import { PlaceHighlight } from "./place_highlight";
import { PlaceSearch } from "./place_search";
import { isPlaceInUsa } from "./util";

// Temporarily hide NL search bar on frontend until backend pipelines are
// implemented.
const SHOW_NL_SEARCH_BAR = false;

// Window scroll position to start fixing the sidebar.
let yScrollLimit = 0;
// Max top position for the sidebar, relative to #sidebar-outer.
let sidebarTopMax = 0;
// Only trigger fixed sidebar beyond this window width.
const Y_SCROLL_WINDOW_BREAKPOINT = 992;
// Margin to apply to the fixed sidebar top.
const Y_SCROLL_MARGIN = 100;

window.onload = () => {
  try {
    renderPage();
    updatePageLayoutState();
    maybeToggleFixedSidebar();
    window.onresize = maybeToggleFixedSidebar;
  } catch (e) {
    return;
  }
};

/**
 *  Make adjustments to sidebar scroll state based on the content.
 */
function updatePageLayoutState(): void {
  yScrollLimit = document.getElementById("main-pane").offsetTop;
  document.getElementById("sidebar-top-spacer").style.height =
    yScrollLimit + "px";
  const sidebarOuterHeight =
    document.getElementById("sidebar-outer").offsetHeight;
  const sidebarRegionHeight =
    document.getElementById("sidebar-region").offsetHeight;
  const footerHeight = document.getElementById("main-footer").offsetHeight;
  sidebarTopMax =
    sidebarOuterHeight - sidebarRegionHeight - Y_SCROLL_MARGIN - footerHeight;
}

/**
 *  Toggle fixed sidebar based on window width.
 */
function maybeToggleFixedSidebar(): void {
  if (window.innerWidth < Y_SCROLL_WINDOW_BREAKPOINT) {
    document.removeEventListener("scroll", adjustMenuPosition);
    document.getElementById("sidebar-region").classList.remove("fixed");
    return;
  }
  document.addEventListener("scroll", adjustMenuPosition);
  document.getElementById("sidebar-region").style.width =
    document.getElementById("sidebar-top-spacer").offsetWidth + "px";
  adjustMenuPosition();
}

/**
 * Update fixed sidebar based on the window scroll.
 */
function adjustMenuPosition(): void {
  const topicsEl = document.getElementById("sidebar-region");
  if (window.scrollY > yScrollLimit) {
    const calcTop = window.scrollY - yScrollLimit - Y_SCROLL_MARGIN;
    if (calcTop > sidebarTopMax) {
      topicsEl.style.top = sidebarTopMax + "px";
      topicsEl.classList.remove("fixed");
      return;
    }
    topicsEl.classList.add("fixed");
    if (topicsEl.style.top != "0") {
      topicsEl.style.top = "0";
      topicsEl.scrollTop = 0;
    }
  } else {
    topicsEl.classList.remove("fixed");
    topicsEl.style.top = "0";
  }
}

/**
 * Get the landing page data
 */
async function getLandingPageData(
  dcid: string,
  category: string,
  locale: string,
  seed: string
): Promise<PageData> {
  return axios
    .get(
      `/api/landingpage/data/${dcid}?category=${category}&hl=${locale}&seed=${seed}`
    )
    .then((resp) => {
      return resp.data;
    });
}

/**
 * Handler for NL search bar
 * @param q search query entered by user
 */
function onSearch(q: string): void {
  triggerGAEvent(GA_EVENT_NL_SEARCH, {
    [GA_PARAM_QUERY]: q,
    [GA_PARAM_SOURCE]: GA_VALUE_SEARCH_SOURCE_PLACE_PAGE,
  });
  window.location.href = `/explore#q=${encodeURIComponent(q)}`;
}

function renderPage(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const urlHash = window.location.hash;
  // Get category and render menu.
  const category = urlParams.get("category") || "Overview";
  const seed = urlParams.get("seed") || "0";
  const dcid = document.getElementById("title").dataset.dcid;
  const placeName = document.getElementById("place-name").dataset.pn;
  const placeType = document.getElementById("place-type").dataset.pt;
  const locale = document.getElementById("locale").dataset.lc;
  const summaryText = document.getElementById("place-summary").dataset.summary;
  const landingPagePromise = getLandingPageData(dcid, category, locale, seed);

  Promise.all([
    landingPagePromise,
    loadLocaleData(locale, [
      import(`../i18n/compiled-lang/${locale}/place.json`),
      // TODO(beets): Figure out how to place this where it's used so dependencies can be automatically resolved.
      import(`../i18n/compiled-lang/${locale}/stats_var_labels.json`),
      import(`../i18n/compiled-lang/${locale}/units.json`),
    ]),
  ])
    .then(([landingPageData]) => {
      const loadingElem = document.getElementById("page-loading");
      if (_.isEmpty(landingPageData)) {
        loadingElem.innerText =
          "Sorry, we don't have any charts to show for this place.";
        return;
      }
      loadingElem.style.display = "none";
      const data: PageData = landingPageData;
      const isUsaPlace = isPlaceInUsa(dcid, data.parentPlaces);

      if (SHOW_NL_SEARCH_BAR) {
        ReactDOM.render(
          React.createElement(NlSearchBar, {
            initialValue: "",
            inputId: "query-search-input",
            onSearch,
            placeholder: `Enter a question to explore`,
            shouldAutoFocus: false,
          }),
          document.getElementById("nl-search-bar")
        );
      } else {
        // when NL search bar is hidden, need to adjust spacing
        document.getElementById("nl-search-bar").style.height = "2rem";
      }

      ReactDOM.render(
        React.createElement(PlaceSearch, {}),
        document.getElementById("place-search-container")
      );

      ReactDOM.render(
        React.createElement(Menu, {
          pageChart: data.pageChart,
          categories: data.categories,
          dcid,
          selectCategory: category,
        }),
        document.getElementById("menu")
      );

      if (!showOverview(isUsaPlace, placeType, category)) {
        // Earth has no parent places.
        if (data.parentPlaces.length > 0) {
          ReactDOM.render(
            React.createElement(ParentPlace, {
              names: data.names,
              parentPlaces: data.parentPlaces,
              placeType,
            }),
            document.getElementById("place-type")
          );
        }
        ReactDOM.render(
          React.createElement(PlaceHighlight, {
            dcid,
            highlight: data.highlight,
          }),
          document.getElementById("place-highlight")
        );
      }

      // Readjust sidebar based on parent places.
      updatePageLayoutState();

      // Display child places alphabetically
      for (const placeType in data.allChildPlaces) {
        data.allChildPlaces[placeType].sort((a, b) => {
          if (!a.name && !b.name) {
            return a.dcid < b.dcid ? -1 : a.dcid > b.dcid ? 1 : 0;
          } else if (!a.name) {
            return 1;
          } else if (!b.name) {
            return -1;
          } else {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
          }
        });
      }
      ReactDOM.render(
        React.createElement(ChildPlace, {
          childPlaces: data.allChildPlaces,
          placeName,
        }),
        document.getElementById("child-place")
      );

      ReactDOM.render(
        React.createElement(PageSubtitle, {
          category,
          categoryDisplayStr: data.categories[category],
          dcid,
        }),
        document.getElementById("subtitle")
      );

      ReactDOM.render(
        React.createElement(MainPane, {
          category,
          dcid,
          isUsaPlace,
          names: data.names,
          pageChart: data.pageChart,
          placeName,
          placeType,
          childPlacesType: data.childPlacesType,
          parentPlaces: data.parentPlaces,
          categoryStrings: data.categories,
          locale,
          highlight: data.highlight,
          summaryText,
        }),
        document.getElementById("main-pane")
      );
      window.location.hash = "";
      window.location.hash = urlHash;
    })
    .catch(() => {
      const loadingElem = document.getElementById("page-loading");
      loadingElem.innerText =
        "Sorry, there was an error loading charts for this place.";
    });
}

export { updatePageLayoutState };
