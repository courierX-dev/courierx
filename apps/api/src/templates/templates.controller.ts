import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity, ApiParam } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplate, UpdateTemplate } from '@courierx/shared';

@ApiTags('Templates')
@Controller('v1/templates')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('bearer')
@ApiSecurity('x-api-key')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new email template',
    description: `
Create a new reusable email template using Handlebars syntax.

**Template Variables:**
Use Handlebars syntax (e.g., {{variableName}}) in your subject and HTML templates.

**Example:**
\`\`\`handlebars
Subject: Welcome {{firstName}}!
HTML: <h1>Hello {{firstName}} {{lastName}}</h1>
\`\`\`

Templates are validated during creation to catch syntax errors early.
    `
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'tpl_1234567890abcdef' },
        name: { type: 'string', example: 'welcome-email' },
        engine: { type: 'string', example: 'hbs' },
        subjectTpl: { type: 'string', example: 'Welcome {{firstName}}!' },
        htmlTpl: { type: 'string', example: '<h1>Hello {{firstName}}</h1>' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid template syntax' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  async create(@Body() createTemplateDto: CreateTemplate, @Req() req: any) {
    return this.templatesService.create(createTemplateDto, req.product.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List all templates',
    description: 'Get all email templates for the authenticated product'
  })
  @ApiResponse({
    status: 200,
    description: 'List of templates',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          engine: { type: 'string' },
          subjectTpl: { type: 'string' },
          htmlTpl: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async findAll(@Req() req: any) {
    return this.templatesService.findAll(req.product.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific template',
    description: 'Retrieve details of a specific email template by ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
    example: 'tpl_1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Template details',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.findOne(id, req.product.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a template',
    description: 'Update an existing email template. All fields are optional.'
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
    example: 'tpl_1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid template syntax' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplate,
    @Req() req: any
  ) {
    return this.templatesService.update(id, updateTemplateDto, req.product.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a template',
    description: 'Permanently delete an email template'
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
    example: 'tpl_1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Template deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Template deleted successfully' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.remove(id, req.product.id);
  }
}
