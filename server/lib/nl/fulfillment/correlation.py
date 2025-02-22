# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from typing import List

import server.lib.explore.existence as exist
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
from server.lib.nl.fulfillment import ranking_across_places
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance


#
# Handler for correlation charts.
#
def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, rank: int) -> bool:
  if len(chart_vars.svs) != 2 or not places:
    state.uttr.counters.err('correlation_failed_noplaceorsv', 1)
    return False
  if not state.place_type:
    state.uttr.counters.err('correlation_failed_noplacetype', 1)
    return False

  # Child existence check for both SVs.
  if len(exist.svs4children(state, places[0], chart_vars.svs).exist_svs) != 2:
    return False

  found = add_chart_to_utterance(ChartType.SCATTER_CHART, state, chart_vars,
                                 places, chart_origin)
  if found:
    ranking_orig = state.ranking_types
    state.ranking_types = [RankingType.HIGH, RankingType.LOW]
    found |= ranking_across_places.populate(state,
                                            chart_vars,
                                            places,
                                            chart_origin,
                                            rank,
                                            ranking_count=5)
    state.ranking_types = ranking_orig

  return found
