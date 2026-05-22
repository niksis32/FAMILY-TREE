import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { resolveRequestLocale } from './geography-i18n';
import { GeographyService } from './geography.service';
import { CreatePlaceDto, UpdatePlaceDto } from './places.dto';
import { PlacesService } from './places.service';

@ApiTags('places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(
    private readonly service: PlacesService,
    private readonly geography: GeographyService,
  ) {}

  @Get('countries')
  @ApiQuery({ name: 'century', required: false, description: 'Century number (19) or roman (XIX)' })
  @ApiQuery({ name: 'lang', required: false, description: 'ISO 639-1 UI locale (GeoNames isolanguage, 185 codes)' })
  listCountries(
    @Query('century') century?: string,
    @Query('lang') lang?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = resolveRequestLocale(lang, acceptLanguage);
    return this.geography.listCountries(century, locale);
  }

  @Get('regions')
  @ApiQuery({ name: 'countryId', required: true })
  @ApiQuery({ name: 'century', required: false })
  @ApiQuery({ name: 'lang', required: false })
  listRegions(
    @Query('countryId') countryId: string,
    @Query('century') century?: string,
    @Query('lang') lang?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = resolveRequestLocale(lang, acceptLanguage);
    return this.geography.listRegions(countryId, century, locale);
  }

  @Get('cities')
  @ApiQuery({ name: 'countryId', required: true })
  @ApiQuery({ name: 'regionId', required: false })
  @ApiQuery({ name: 'century', required: false })
  @ApiQuery({ name: 'lang', required: false })
  listCities(
    @Query('countryId') countryId: string,
    @Query('regionId') regionId?: string,
    @Query('century') century?: string,
    @Query('lang') lang?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = resolveRequestLocale(lang, acceptLanguage);
    return this.geography.listCities(countryId, regionId, century, locale);
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'century', required: false })
  @ApiQuery({ name: 'countryId', required: false, description: 'Limit city hits to this country scope' })
  @ApiQuery({ name: 'regionId', required: false, description: 'Limit city hits to admin1 region' })
  @ApiQuery({ name: 'lang', required: false })
  searchPlaces(
    @Query('q') q: string,
    @Query('century') century?: string,
    @Query('countryId') countryId?: string,
    @Query('regionId') regionId?: string,
    @Query('lang') lang?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = resolveRequestLocale(lang, acceptLanguage);
    return this.geography.search(q, century, locale, { countryId, regionId });
  }

  @Get('cities/:cityId/details')
  @ApiQuery({ name: 'lang', required: false })
  cityDetails(
    @Param('cityId') cityId: string,
    @Query('lang') lang?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = resolveRequestLocale(lang, acceptLanguage);
    return this.geography.getCityDetails(cityId, locale);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreatePlaceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  update(@Param('id') id: string, @Body() dto: UpdatePlaceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
